package com.mutrapro.project_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.dto.request.InitESignRequest;
import com.mutrapro.project_service.dto.request.VerifyOTPRequest;
import com.mutrapro.project_service.dto.response.ESignInitResponse;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.shared.event.ContractNotificationEvent;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractSignSession;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.SignSessionStatus;
import com.mutrapro.project_service.exception.*;
import com.mutrapro.project_service.repository.ContractInstallmentRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.ContractSignSessionRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.entity.ContractInstallment;
import com.mutrapro.project_service.enums.InstallmentStatus;
import com.mutrapro.project_service.enums.InstallmentType;
import com.mutrapro.shared.service.S3Service;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Random;
import java.util.UUID;

import com.mutrapro.shared.event.ContractOtpEmailEvent;
import com.mutrapro.shared.event.ContractSignedEmailEvent;
import com.mutrapro.shared.event.ContractSignedEvent;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class ESignService {

    final ContractRepository contractRepository;
    final ContractSignSessionRepository signSessionRepository;
    final OutboxEventRepository outboxEventRepository;
    final ContractInstallmentRepository contractInstallmentRepository;
    final ObjectMapper objectMapper;
    final S3Service s3Service;
    final RequestServiceFeignClient requestServiceFeignClient;
    final StudioBookingService studioBookingService;

    @Value("${esign.otp.expiration-minutes:5}")
    int otpExpirationMinutes;

    @Value("${esign.otp.max-attempts:3}")
    int maxOtpAttempts;

    @Value("${esign.otp.length:6}")
    int otpLength;

    /**
     * Helper method để publish event vào outbox
     */
    private void publishToOutbox(Object event, String aggregateIdString, String aggregateType, String eventType) {
        try {
            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(aggregateIdString);
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType(aggregateType)
                    .eventType(eventType)
                    .eventPayload(payload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.debug("Queued event in outbox: eventType={}, aggregateId={}", eventType, aggregateId);
        } catch (Exception e) {
            log.error("Failed to enqueue event to outbox: eventType={}, aggregateId={}, error={}", 
                    eventType, aggregateIdString, e.getMessage(), e);
            // Không throw exception để không fail transaction
        }
    }

    /**
     * Initialize e-signature process: save signature temporarily and send OTP
     */
    @Transactional
    public ESignInitResponse initESign(String contractId, InitESignRequest request) {
        String currentUserId = getCurrentUserId();

        // Load and validate contract
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));

        // Validate contract status: must be APPROVED
        if (contract.getStatus() != ContractStatus.approved) {
            throw InvalidContractStatusException.forSign(contractId, contract.getStatus().name());
        }

        // Validate contract not expired
        if (contract.getExpiresAt() != null && LocalDateTime.now().isAfter(contract.getExpiresAt())) {
            throw InvalidContractStatusException.forExpired(contractId);
        }

        // Validate user is the customer
        if (!contract.getUserId().equals(currentUserId)) {
            throw UnauthorizedException.create("Only the customer can sign this contract");
        }

        String targetEmail = contract.getEmailSnapshot();
        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            throw UnauthorizedException.create("Customer email is missing. Cannot send OTP.");
        }

        // Cancel any existing pending sign sessions for this contract
        signSessionRepository.findByContractIdAndUserIdAndStatus(
                contractId, currentUserId, SignSessionStatus.PENDING
        ).ifPresent(existingSession -> {
            existingSession.setStatus(SignSessionStatus.CANCELLED);
            existingSession.setUpdatedAt(LocalDateTime.now());
            signSessionRepository.save(existingSession);
            log.info("Cancelled existing sign session: {}", existingSession.getSessionId());
        });

        // Generate OTP
        String otpCode = generateOTP();
        LocalDateTime expireAt = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        // Create new sign session
        ContractSignSession signSession = ContractSignSession.builder()
                .contractId(contractId)
                .userId(currentUserId)
                .signatureTempBase64(request.getSignatureBase64())
                .otpCode(otpCode)
                .expireAt(expireAt)
                .attemptCount(0)
                .status(SignSessionStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        signSessionRepository.save(signSession);

        // Send OTP email via notification-service (Kafka)
        sendOTPEmail(contract, targetEmail.trim(), otpCode, expireAt);

        log.info("E-signature session initiated for contract: {}, session: {}", 
                contractId, signSession.getSessionId());

        return ESignInitResponse.builder()
                .sessionId(signSession.getSessionId())
                .message("OTP has been sent to your email")
                .expireAt(expireAt)
                .maxAttempts(maxOtpAttempts)
                .build();
    }

    /**
     * Verify OTP and complete e-signature
     */
    @Transactional
    public void verifyOTPAndSign(String contractId, VerifyOTPRequest request) {
        String currentUserId = getCurrentUserId();

        // Load sign session
        ContractSignSession signSession = signSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> SignSessionException.notFound(request.getSessionId()));

        // Validate session belongs to this user and contract
        if (!signSession.getUserId().equals(currentUserId) || !signSession.getContractId().equals(contractId)) {
            throw UnauthorizedException.create("Invalid sign session");
        }

        // Validate session status
        if (signSession.getStatus() != SignSessionStatus.PENDING) {
            throw SignSessionException.notFound(request.getSessionId());
        }

        // Check if expired
        if (LocalDateTime.now().isAfter(signSession.getExpireAt())) {
            signSession.setStatus(SignSessionStatus.EXPIRED);
            signSession.setUpdatedAt(LocalDateTime.now());
            signSessionRepository.save(signSession);
            throw OTPException.expired();
        }

        // Check max attempts
        if (signSession.getAttemptCount() >= maxOtpAttempts) {
            signSession.setStatus(SignSessionStatus.CANCELLED);
            signSession.setUpdatedAt(LocalDateTime.now());
            signSessionRepository.save(signSession);
            throw OTPException.maxAttemptsExceeded(maxOtpAttempts);
        }

        // Verify OTP
        if (!signSession.getOtpCode().equals(request.getOtpCode())) {
            // Increment attempt count
            signSession.setAttemptCount(signSession.getAttemptCount() + 1);
            signSession.setUpdatedAt(LocalDateTime.now());
            signSessionRepository.save(signSession);

            // Check if max attempts exceeded after increment
            if (signSession.getAttemptCount() >= maxOtpAttempts) {
                signSession.setStatus(SignSessionStatus.CANCELLED);
                signSessionRepository.save(signSession);
                throw OTPException.maxAttemptsExceeded(maxOtpAttempts);
            }

            int remainingAttempts = maxOtpAttempts - signSession.getAttemptCount();
            throw new OTPException(
                    com.mutrapro.project_service.enums.ProjectServiceErrorCodes.INVALID_OTP,
                    String.format("Invalid OTP. %d attempt(s) remaining.", remainingAttempts)
            );
        }

        // OTP is valid, proceed to sign contract
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));

        // Upload signature to S3 and get file key
        String signatureS3Key = uploadSignatureToS3(
                signSession.getSignatureTempBase64(),
                contractId,
                currentUserId
        );

        // Update contract with signature
        contract.setCustomerSignatureS3Key(signatureS3Key);
        LocalDateTime now = LocalDateTime.now();
        contract.setCustomerSignedAt(now);
        contract.setSignedAt(now);
        contract.setStatus(ContractStatus.signed);

        // KHÔNG set expectedStartDate khi ký - sẽ set khi deposit được thanh toán
        // expectedStartDate = null cho đến khi deposit paid
        // Due date sẽ được tính từ plannedDueDate của milestone cuối cùng
        contract.setExpectedStartDate(null);

        contractRepository.save(contract);

        // Cập nhật DEPOSIT installment: PENDING -> DUE khi contract được ký
        List<ContractInstallment> depositInstallments = contractInstallmentRepository
            .findByContractIdAndStatus(contractId, InstallmentStatus.PENDING);
        for (ContractInstallment installment : depositInstallments) {
            if (installment.getType() == InstallmentType.DEPOSIT) {
                installment.setStatus(InstallmentStatus.DUE);
                contractInstallmentRepository.save(installment);
                log.info("Updated DEPOSIT installment to DUE: installmentId={}, contractId={}", 
                    installment.getInstallmentId(), contractId);
            }
        }

        // Mark sign session as verified
        signSession.setStatus(SignSessionStatus.VERIFIED);
        signSession.setUpdatedAt(LocalDateTime.now());
        signSessionRepository.save(signSession);

        log.info("Contract signed successfully: {}, signature key: {}", contractId, signatureS3Key);

        // Cập nhật request status thành "contract_signed"
        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "contract_signed");
            log.info("Updated request status to contract_signed: requestId={}, contractId={}", 
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            log.error("Failed to update request status: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }
        
        // Link booking với contract và milestone (chỉ cho recording contracts)
        if (contract.getContractType() == ContractType.recording) {
            try {
                studioBookingService.linkBookingToContract(contract.getRequestId(), contractId);
            } catch (Exception e) {
                log.error("Failed to link booking to contract: requestId={}, contractId={}, error={}", 
                    contract.getRequestId(), contractId, e.getMessage(), e);
                // Không throw exception để không fail transaction
            }
        }

        // 3. Gửi notification cho manager qua Kafka
        try {
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                ? contract.getContractNumber()
                : contractId;
            
            ContractNotificationEvent event = ContractNotificationEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .userId(contract.getManagerUserId())
                    .notificationType("CONTRACT_APPROVED")
                    .title("Contract đã được ký")
                    .content(String.format("Customer đã ký contract #%s. Đang chờ thanh toán deposit để bắt đầu công việc.", 
                            contractLabel))
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts")
                    .timestamp(LocalDateTime.now())
                    .build();
            
            publishToOutbox(event, contractId, "Contract", "contract.notification");
            log.info("Queued ContractNotificationEvent in outbox: eventId={}, contractId={}, userId={}", 
                    event.getEventId(), contractId, contract.getManagerUserId());
        } catch (Exception e) {
            log.error("Failed to enqueue notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }

        // 4. Publish ContractSignedEvent để chat-service tạo room và gửi system message
        // Note: System message sẽ được gửi từ ContractEventConsumer sau khi room được tạo
        publishContractSignedEvent(contract, now);

        // 5. Send success email
        sendSignSuccessEmail(contract);
    }

    /**
     * Upload signature image to S3
     */
    private String uploadSignatureToS3(String signatureBase64, String contractId, String userId) {
        try {
            // Remove data URI prefix if present (e.g., "data:image/png;base64,")
            String base64Data = signatureBase64;
            if (signatureBase64.contains(",")) {
                String[] parts = signatureBase64.split(",", 2); // Limit to 2 parts
                if (parts.length > 1 && !parts[1].isEmpty()) {
                    base64Data = parts[1]; // Get the base64 data after comma
                } else {
                    // If no data after comma, use the whole string (might already be pure base64)
                    base64Data = signatureBase64;
                    log.warn("Signature data appears to have comma but no data after it, using full string");
                }
            }

            // Decode base64 to bytes
            byte[] signatureBytes = Base64.getDecoder().decode(base64Data);

            // Upload to S3 and return file key only (not URL for security)
            String fileName = String.format("signature-%s-%s.png", contractId, userId);
            String fileKey = s3Service.uploadFileAndReturnKey(
                    new ByteArrayInputStream(signatureBytes),
                    fileName,
                    "image/png",
                    signatureBytes.length,
                    "contracts/signatures"
            );

            return fileKey;
        } catch (Exception e) {
            log.error("Failed to upload signature to S3: {}", e.getMessage(), e);
            throw SignatureException.uploadFailed(e.getMessage());
        }
    }

    /**
     * Generate random OTP code
     */
    private String generateOTP() {
        Random random = new Random();
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < otpLength; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }

    /**
     * Publish event to send OTP email via notification-service
     */
    private void sendOTPEmail(Contract contract, String targetEmail, String otpCode, LocalDateTime expireAt) {
        long expiresInMinutes = java.time.Duration.between(LocalDateTime.now(), expireAt).toMinutes();
        if (expiresInMinutes <= 0) {
            expiresInMinutes = otpExpirationMinutes;
        }

        String contractDisplay = contract.getContractNumber();
        if (contractDisplay == null || contractDisplay.isBlank()) {
            contractDisplay = contract.getContractId().substring(0, Math.min(8, contract.getContractId().length()));
        }

        String customerName = contract.getNameSnapshot();
        if (customerName == null || customerName.isBlank()) {
            customerName = "Customer";
        }

        ContractOtpEmailEvent event = ContractOtpEmailEvent.builder()
                .eventId(UUID.randomUUID())
                .contractId(contract.getContractId())
                .contractNumber(contractDisplay)
                .customerName(customerName)
                .email(targetEmail)
                .otpCode(otpCode)
                .expiresInMinutes(expiresInMinutes)
                .maxAttempts(maxOtpAttempts)
                .timestamp(LocalDateTime.now())
                .build();

        try {
            JsonNode payload = objectMapper.valueToTree(event);

            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(contract.getContractId());
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("Contract")
                    .eventType("contract.otp.email")
                    .eventPayload(payload)
                    .build();

            outboxEventRepository.save(outboxEvent);

            log.info("Queued ContractOtpEmailEvent in outbox: eventId={}, contractId={}, email={}",
                    event.getEventId(), contract.getContractId(), targetEmail);
        } catch (Exception ex) {
            log.error("Failed to enqueue ContractOtpEmailEvent: contractId={}, email={}, error={}",
                    contract.getContractId(), targetEmail, ex.getMessage(), ex);
        }
    }

    /**
     * Send success email after signing
     */
    private void sendSignSuccessEmail(Contract contract) {
        String customerEmail = contract.getEmailSnapshot();
        if (customerEmail == null || customerEmail.isBlank()) {
            log.warn("Cannot send contract signed email, customer email missing: contractId={}", contract.getContractId());
            return;
        }

        String contractDisplay = contract.getContractNumber();
        if (contractDisplay == null || contractDisplay.isBlank()) {
            contractDisplay = contract.getContractId().substring(0, Math.min(8, contract.getContractId().length()));
        }

        String customerName = contract.getNameSnapshot();
        if (customerName == null || customerName.isBlank()) {
            customerName = "Customer";
        }

        ContractSignedEmailEvent event = ContractSignedEmailEvent.builder()
                .eventId(UUID.randomUUID())
                .contractId(contract.getContractId())
                .contractNumber(contractDisplay)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .managerName(null)
                .managerEmail(null)
                .signedAt(contract.getSignedAt())
                .timestamp(LocalDateTime.now())
                .build();

        try {
            JsonNode payload = objectMapper.valueToTree(event);

            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(contract.getContractId());
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("Contract")
                    .eventType("contract.signed.email")
                    .eventPayload(payload)
                    .build();

            outboxEventRepository.save(outboxEvent);

            log.info("Queued ContractSignedEmailEvent in outbox: eventId={}, contractId={}, email={}",
                    event.getEventId(), contract.getContractId(), customerEmail);
        } catch (Exception ex) {
            log.error("Failed to enqueue ContractSignedEmailEvent: contractId={}, email={}, error={}",
                    contract.getContractId(), customerEmail, ex.getMessage(), ex);
        }
    }

    /**
     * Publish ContractSignedEvent để chat-service tạo room
     */
    private void publishContractSignedEvent(Contract contract, LocalDateTime signedAt) {
        try {
            String contractDisplay = contract.getContractNumber();
            if (contractDisplay == null || contractDisplay.isBlank()) {
                contractDisplay = contract.getContractId().substring(0, Math.min(8, contract.getContractId().length()));
            }

            String customerName = contract.getNameSnapshot();
            if (customerName == null || customerName.isBlank()) {
                customerName = "Customer";
            }

            ContractSignedEvent event = ContractSignedEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contract.getContractId())
                    .contractNumber(contractDisplay)
                    .requestId(contract.getRequestId())
                    .customerId(contract.getUserId())
                    .customerName(customerName)
                    .managerId(contract.getManagerUserId())
                    .managerName(null) // Manager name sẽ được fetch trong consumer nếu cần
                    .signedAt(signedAt)
                    .timestamp(LocalDateTime.now())
                    .build();

            JsonNode payload = objectMapper.valueToTree(event);

            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(contract.getContractId());
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("Contract")
                    .eventType("contract.signed")
                    .eventPayload(payload)
                    .build();

            outboxEventRepository.save(outboxEvent);

            log.info("Queued ContractSignedEvent in outbox: eventId={}, contractId={}, customerId={}, managerId={}",
                    event.getEventId(), contract.getContractId(), contract.getUserId(), contract.getManagerUserId());
        } catch (Exception ex) {
            log.error("Failed to enqueue ContractSignedEvent: contractId={}, error={}",
                    contract.getContractId(), ex.getMessage(), ex);
        }
    }

    /**
     * Get current user ID from JWT token
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            log.error("userId claim not found in JWT - this should not happen!");
            throw UnauthorizedException.create("User not authenticated");
        }
        throw UnauthorizedException.create("User not authenticated");
    }
}

