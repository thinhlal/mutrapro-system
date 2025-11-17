package com.mutrapro.project_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.dto.request.InitESignRequest;
import com.mutrapro.project_service.dto.request.VerifyOTPRequest;
import com.mutrapro.project_service.dto.response.ESignInitResponse;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.NotificationServiceFeignClient;
import com.mutrapro.project_service.client.ChatServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateNotificationRequest;
import com.mutrapro.project_service.dto.request.SendSystemMessageRequest;
import com.mutrapro.project_service.dto.response.ChatRoomResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractSignSession;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.SignSessionStatus;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.enums.NotificationType;
import com.mutrapro.project_service.exception.*;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.ContractSignSessionRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
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
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Random;
import java.util.UUID;

import com.mutrapro.shared.event.ContractOtpEmailEvent;
import com.mutrapro.shared.event.ContractSignedEmailEvent;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class ESignService {

    final ContractRepository contractRepository;
    final ContractSignSessionRepository signSessionRepository;
    final OutboxEventRepository outboxEventRepository;
    final ObjectMapper objectMapper;
    final S3Service s3Service;
    final RequestServiceFeignClient requestServiceFeignClient;
    final NotificationServiceFeignClient notificationServiceFeignClient;
    final ChatServiceFeignClient chatServiceFeignClient;

    @Value("${esign.otp.expiration-minutes:5}")
    int otpExpirationMinutes;

    @Value("${esign.otp.max-attempts:3}")
    int maxOtpAttempts;

    @Value("${esign.otp.length:6}")
    int otpLength;

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
        if (contract.getExpiresAt() != null && Instant.now().isAfter(contract.getExpiresAt())) {
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
            existingSession.setUpdatedAt(Instant.now());
            signSessionRepository.save(existingSession);
            log.info("Cancelled existing sign session: {}", existingSession.getSessionId());
        });

        // Generate OTP
        String otpCode = generateOTP();
        Instant expireAt = Instant.now().plus(otpExpirationMinutes, ChronoUnit.MINUTES);

        // Create new sign session
        ContractSignSession signSession = ContractSignSession.builder()
                .contractId(contractId)
                .userId(currentUserId)
                .signatureTempBase64(request.getSignatureBase64())
                .otpCode(otpCode)
                .expireAt(expireAt)
                .attemptCount(0)
                .status(SignSessionStatus.PENDING)
                .createdAt(Instant.now())
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
        if (Instant.now().isAfter(signSession.getExpireAt())) {
            signSession.setStatus(SignSessionStatus.EXPIRED);
            signSession.setUpdatedAt(Instant.now());
            signSessionRepository.save(signSession);
            throw OTPException.expired();
        }

        // Check max attempts
        if (signSession.getAttemptCount() >= maxOtpAttempts) {
            signSession.setStatus(SignSessionStatus.CANCELLED);
            signSession.setUpdatedAt(Instant.now());
            signSessionRepository.save(signSession);
            throw OTPException.maxAttemptsExceeded(maxOtpAttempts);
        }

        // Verify OTP
        if (!signSession.getOtpCode().equals(request.getOtpCode())) {
            // Increment attempt count
            signSession.setAttemptCount(signSession.getAttemptCount() + 1);
            signSession.setUpdatedAt(Instant.now());
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

        // Upload signature to S3
        String signatureS3Url = uploadSignatureToS3(
                signSession.getSignatureTempBase64(),
                contractId,
                currentUserId
        );

        // Update contract with signature
        contract.setBSignatureS3Url(signatureS3Url);
        Instant now = Instant.now();
        contract.setBSignedAt(now);
        contract.setSignedAt(now);
        contract.setUpdatedAt(now);
        contract.setStatus(ContractStatus.signed);

        // KHÔNG set expectedStartDate khi ký - sẽ set khi deposit được thanh toán
        // expectedStartDate = null cho đến khi deposit paid
        // dueDate cũng sẽ được tính lại từ expectedStartDate khi deposit paid
        contract.setExpectedStartDate(null);
        contract.setDueDate(null);

        contractRepository.save(contract);

        // Mark sign session as verified
        signSession.setStatus(SignSessionStatus.VERIFIED);
        signSession.setUpdatedAt(Instant.now());
        signSessionRepository.save(signSession);

        log.info("Contract signed successfully: {}, signature URL: {}", contractId, signatureS3Url);

        // Cập nhật request status thành "contract_signed"
        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "contract_signed");
            log.info("Updated request status to contract_signed: requestId={}, contractId={}", 
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            log.error("Failed to update request status: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }

        // 3. Gửi notification cho manager
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getManagerUserId())
                    .type(NotificationType.CONTRACT_APPROVED)
                    .title("Contract đã được ký")
                    .content(String.format("Customer đã ký contract #%s. Đang chờ thanh toán deposit để bắt đầu công việc.", 
                            contract.getContractNumber()))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts-list")
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent notification to manager: userId={}, contractId={}", 
                    contract.getManagerUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }

        // 4. Gửi system message vào chat room
        try {
            ApiResponse<ChatRoomResponse> roomResponse = 
                chatServiceFeignClient.getChatRoomByRequestId("REQUEST_CHAT", contract.getRequestId());
            
            if (roomResponse != null && "success".equals(roomResponse.getStatus()) 
                && roomResponse.getData() != null) {
                ChatRoomResponse roomData = roomResponse.getData();
                String roomId = roomData.getRoomId();
                
                if (roomId != null && !roomId.isBlank()) {
                    String systemMessage = String.format(
                        "✍️ Customer đã ký contract #%s. Đang chờ thanh toán deposit để bắt đầu công việc.",
                        contract.getContractNumber()
                    );
                    
                    SendSystemMessageRequest messageRequest = SendSystemMessageRequest.builder()
                        .roomId(roomId)
                        .messageType("SYSTEM")
                        .content(systemMessage)
                        .build();
                    
                    chatServiceFeignClient.sendSystemMessage(messageRequest);
                    log.info("Sent system message to chat room: roomId={}, requestId={}", 
                        roomId, contract.getRequestId());
                }
            }
        } catch (Exception e) {
            log.error("Failed to send system message to chat room: requestId={}, error={}", 
                contract.getRequestId(), e.getMessage(), e);
        }

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
                base64Data = signatureBase64.split(",")[1];
            }

            // Decode base64 to bytes
            byte[] signatureBytes = Base64.getDecoder().decode(base64Data);

            // Upload to S3
            String fileName = String.format("signature-%s-%s.png", contractId, userId);
            String s3Url = s3Service.uploadFile(
                    new ByteArrayInputStream(signatureBytes),
                    fileName,
                    "image/png",
                    signatureBytes.length,
                    "contracts/signatures",
                    false  // Private file
            );

            return s3Url;
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
    private void sendOTPEmail(Contract contract, String targetEmail, String otpCode, Instant expireAt) {
        long expiresInMinutes = ChronoUnit.MINUTES.between(Instant.now(), expireAt);
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
                .timestamp(Instant.now())
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
                    .eventType("contract.otp-email")
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
                .timestamp(Instant.now())
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
                    .eventType("contract.signed-email")
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
     * Get current user ID from JWT token
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            log.warn("userId claim not found in JWT, falling back to subject");
            return jwt.getSubject();
        }
        throw UnauthorizedException.create("User not authenticated");
    }
}

