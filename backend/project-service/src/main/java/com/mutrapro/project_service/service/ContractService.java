package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.ChatServiceFeignClient;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.NotificationServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.request.CreateMilestoneRequest;
import com.mutrapro.project_service.dto.request.CreateNotificationRequest;
import com.mutrapro.project_service.dto.request.SendSystemMessageRequest;
import com.mutrapro.project_service.dto.response.ChatRoomResponse;
import com.mutrapro.project_service.dto.response.ContractInstallmentResponse;
import com.mutrapro.project_service.dto.response.ContractMilestoneResponse;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.dto.response.RequestContractInfo;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractInstallment;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import com.mutrapro.project_service.enums.GateCondition;
import com.mutrapro.project_service.enums.InstallmentStatus;
import com.mutrapro.project_service.enums.InstallmentType;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.SignSessionStatus;
import com.mutrapro.project_service.exception.ContractAlreadyExistsException;
import com.mutrapro.project_service.dto.request.CustomerActionRequest;
import com.mutrapro.project_service.exception.ContractExpiredException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.ContractInstallmentNotFoundException;
import com.mutrapro.project_service.exception.ContractMilestoneNotFoundException;
import com.mutrapro.project_service.exception.ContractPdfUploadException;
import com.mutrapro.project_service.exception.ContractValidationException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.exception.InvalidInstallmentTypeException;
import com.mutrapro.project_service.exception.InvalidRequestIdException;
import com.mutrapro.project_service.exception.InvalidRequestStatusException;
import com.mutrapro.project_service.exception.MilestonePaymentException;
import com.mutrapro.project_service.exception.MissingReasonException;
import com.mutrapro.project_service.exception.ServiceRequestNotFoundException;
import com.mutrapro.project_service.exception.SignatureRetrieveException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.UserNotAuthenticatedException;
import com.mutrapro.project_service.mapper.ContractMapper;
import com.mutrapro.project_service.mapper.ContractMilestoneMapper;
import com.mutrapro.project_service.repository.ContractInstallmentRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractSignSessionRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.ContentType;
import com.mutrapro.shared.enums.NotificationType;
import com.mutrapro.shared.dto.ApiResponse;

import java.time.LocalDateTime;
import java.time.ZoneId;

import com.mutrapro.project_service.exception.SignatureImageNotFoundException;
import com.mutrapro.shared.service.S3Service;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ContractService {

    ContractRepository contractRepository;
    ContractMilestoneRepository contractMilestoneRepository;
    ContractInstallmentRepository contractInstallmentRepository;
    ContractMapper contractMapper;
    ContractMilestoneMapper contractMilestoneMapper;
    RequestServiceFeignClient requestServiceFeignClient;
    ChatServiceFeignClient chatServiceFeignClient;
    NotificationServiceFeignClient notificationServiceFeignClient;
    ContractSignSessionRepository contractSignSessionRepository;
    FileRepository fileRepository;
    MilestoneProgressService milestoneProgressService;
    TaskAssignmentService taskAssignmentService;
    
    @Autowired(required = false)
    S3Service s3Service;

    /**
     * Tạo contract từ service request
     * @param requestId ID của service request
     * @param createRequest Thông tin để tạo contract
     * @return ContractResponse
     */
    @Transactional
    public ContractResponse createContractFromServiceRequest(String requestId, CreateContractRequest createRequest) {
        // Validate requestId is required
        if (requestId == null || requestId.isBlank()) {
            throw InvalidRequestIdException.required();
        }
        
        // Validate requestId in createRequest matches path parameter
        if (createRequest.getRequestId() != null && !createRequest.getRequestId().equals(requestId)) {
            throw InvalidRequestIdException.mismatch(requestId, createRequest.getRequestId());
        }
        
        // Lấy thông tin service request từ request-service
        ApiResponse<ServiceRequestInfoResponse> serviceRequestResponse = 
            requestServiceFeignClient.getServiceRequestById(requestId);
        
        if (serviceRequestResponse == null || !"success".equals(serviceRequestResponse.getStatus()) 
            || serviceRequestResponse.getData() == null) {
            throw ServiceRequestNotFoundException.byId(requestId);
        }
        
        ServiceRequestInfoResponse serviceRequest = serviceRequestResponse.getData();
        
        // Kiểm tra request status - không cho tạo contract nếu request đã cancelled/completed/rejected
        String requestStatus = serviceRequest.getStatus();
        if ("cancelled".equalsIgnoreCase(requestStatus) 
            || "completed".equalsIgnoreCase(requestStatus) 
            || "rejected".equalsIgnoreCase(requestStatus)) {
            throw InvalidRequestStatusException.cannotCreateContract(requestId, requestStatus);
        }
        
        // Kiểm tra xem request đã có manager chưa
        if (serviceRequest.getManagerUserId() == null || serviceRequest.getManagerUserId().isBlank()) {
            throw UnauthorizedException.create(
                "Cannot create contract: Service request has no assigned manager");
        }
        
        // Kiểm tra xem đã có contract ACTIVE cho request này chưa
        // Cho phép tạo contract mới nếu contract cũ đã bị cancel/reject/need_revision/expired
        List<Contract> existingContracts = contractRepository.findByRequestId(requestId);
        if (!existingContracts.isEmpty()) {
            // Kiểm tra xem có contract nào đang ở trạng thái ACTIVE không
            boolean hasActiveContract = existingContracts.stream()
                .anyMatch(c -> {
                    ContractStatus status = c.getStatus();
                    return status == ContractStatus.draft 
                        || status == ContractStatus.sent 
                        || status == ContractStatus.approved 
                        || status == ContractStatus.signed
                        || status == ContractStatus.active
                        || status == ContractStatus.active_pending_assignment;
                });
            
            if (hasActiveContract) {
                throw ContractAlreadyExistsException.forRequest(requestId);
            }
            // Nếu chỉ có contract đã bị cancel/reject/need_revision/expired, cho phép tạo mới
            log.info("Request {} has inactive contracts (canceled/rejected/need_revision/expired), allowing new contract creation", requestId);
        }
        
        // Lấy current user ID (phải là manager của request)
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(serviceRequest.getManagerUserId())) {
            throw UnauthorizedException.create(
                "Only the assigned manager can create contract for this request");
        }
        
        // Map ServiceType sang ContractType
        ContractType contractType = mapServiceTypeToContractType(serviceRequest.getRequestType());
        if (createRequest.getContractType() != null) {
            contractType = createRequest.getContractType();
        }
        
        // Tạo contract number
        String contractNumber = generateContractNumber(contractType);
        
        // Tính toán pricing
        BigDecimal totalPrice = createRequest.getTotalPrice() != null 
            ? createRequest.getTotalPrice() 
            : (serviceRequest.getTotalPrice() != null ? serviceRequest.getTotalPrice() : BigDecimal.ZERO);
        
        CurrencyType currency = createRequest.getCurrency() != null
            ? createRequest.getCurrency()
            : (serviceRequest.getCurrency() != null 
                ? CurrencyType.valueOf(serviceRequest.getCurrency()) 
                : CurrencyType.VND);
        
        BigDecimal depositPercent = createRequest.getDepositPercent() != null
            ? createRequest.getDepositPercent()
            : BigDecimal.valueOf(40.0);
        
        // Tính SLA days (default values based on contract type)
        Integer slaDays = createRequest.getSlaDays() != null
            ? createRequest.getSlaDays()
            : getDefaultSlaDays(contractType);
        
        // Revision deadline days - lấy từ request
        Integer revisionDeadlineDays = createRequest.getRevisionDeadlineDays();
        
        // KHÔNG set expectedStartDate lúc tạo contract
        // Chỉ set khi deposit được thanh toán để đảm bảo tính đúng từ ngày thanh toán
        Instant expectedStartDate = null;
        
        // Tạo contract entity
        Contract contract = Contract.builder()
            .requestId(requestId)
            .userId(serviceRequest.getUserId())
            .managerUserId(serviceRequest.getManagerUserId())
            .contractNumber(contractNumber)
            .contractType(contractType)
            .status(ContractStatus.draft)
            .termsAndConditions(createRequest.getTermsAndConditions())
            .specialClauses(createRequest.getSpecialClauses())
            .notes(createRequest.getNotes())
            .totalPrice(totalPrice)
            .currency(currency)
            .depositPercent(depositPercent)
            .expectedStartDate(expectedStartDate)
            .slaDays(slaDays)
            .freeRevisionsIncluded(createRequest.getFreeRevisionsIncluded() != null 
                ? createRequest.getFreeRevisionsIncluded() : 1)
            .additionalRevisionFeeVnd(createRequest.getAdditionalRevisionFeeVnd())
            .revisionDeadlineDays(revisionDeadlineDays)
            .expiresAt(createRequest.getExpiresAt())
            // Snapshot contact info
            .nameSnapshot(serviceRequest.getContactName() != null ? serviceRequest.getContactName() : "N/A")
            .phoneSnapshot(serviceRequest.getContactPhone() != null ? serviceRequest.getContactPhone() : "N/A")
            .emailSnapshot(serviceRequest.getContactEmail() != null ? serviceRequest.getContactEmail() : "N/A")
            .build();
        
        Contract saved = contractRepository.save(contract);
        log.info("Created contract from service request: contractId={}, requestId={}, contractNumber={}", 
            saved.getContractId(), requestId, contractNumber);
        
        // Validate và tạo milestones từ request nếu có
        List<ContractMilestone> createdMilestones = new java.util.ArrayList<>();
        if (createRequest.getMilestones() != null && !createRequest.getMilestones().isEmpty()) {
            // Validate: depositPercent + sum(paymentPercent của milestones có hasPayment=true) = 100%
            validatePaymentPercentages(createRequest.getDepositPercent(), createRequest.getMilestones());
            
            // Validate: sum(milestoneSlaDays) = contract slaDays
            validateMilestoneSlaDays(createRequest.getSlaDays(), createRequest.getMilestones());
            
            // Tạo milestones
            createdMilestones = createMilestonesFromRequest(saved, createRequest.getMilestones());
        }
        
        // Tạo installments theo quy tắc mới
        createInstallmentsForContract(saved, createRequest.getDepositPercent(), 
            createRequest.getMilestones(), createdMilestones);
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    /**
     * Update existing contract (only for DRAFT contracts)
     */
    @Transactional
    public ContractResponse updateContract(String contractId, com.mutrapro.project_service.dto.request.UpdateContractRequest updateRequest) {
        // Lấy contract hiện tại
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra contract phải ở trạng thái DRAFT
        if (contract.getStatus() != ContractStatus.draft) {
            throw InvalidContractStatusException.forUpdate(contractId, contract.getStatus().name());
        }
        
        // Lấy thông tin service request để kiểm tra quyền
        ApiResponse<ServiceRequestInfoResponse> serviceRequestResponse = 
            requestServiceFeignClient.getServiceRequestById(contract.getRequestId());
        
        if (serviceRequestResponse == null || !"success".equals(serviceRequestResponse.getStatus()) 
            || serviceRequestResponse.getData() == null) {
            throw ServiceRequestNotFoundException.byId(contract.getRequestId());
        }
        
        ServiceRequestInfoResponse serviceRequest = serviceRequestResponse.getData();
        
        // Kiểm tra current user phải là manager của request
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(serviceRequest.getManagerUserId())) {
            throw UnauthorizedException.create(
                "Only the assigned manager can update contract for this request");
        }
        
        // Update các fields nếu có trong request
        if (updateRequest.getContractType() != null) {
            contract.setContractType(updateRequest.getContractType());
        }
        
        if (updateRequest.getTermsAndConditions() != null) {
            contract.setTermsAndConditions(updateRequest.getTermsAndConditions());
        }
        
        if (updateRequest.getSpecialClauses() != null) {
            contract.setSpecialClauses(updateRequest.getSpecialClauses());
        }
        
        if (updateRequest.getNotes() != null) {
            contract.setNotes(updateRequest.getNotes());
        }
        
        if (updateRequest.getTotalPrice() != null) {
            contract.setTotalPrice(updateRequest.getTotalPrice());
        }
        
        if (updateRequest.getCurrency() != null) {
            contract.setCurrency(updateRequest.getCurrency());
        }
        
        if (updateRequest.getDepositPercent() != null) {
            contract.setDepositPercent(updateRequest.getDepositPercent());
        }
        
        
        if (updateRequest.getExpectedStartDate() != null) {
            contract.setExpectedStartDate(updateRequest.getExpectedStartDate());
        }
        
        if (updateRequest.getSlaDays() != null) {
            contract.setSlaDays(updateRequest.getSlaDays());
        }
        
        if (updateRequest.getFreeRevisionsIncluded() != null) {
            contract.setFreeRevisionsIncluded(updateRequest.getFreeRevisionsIncluded());
        }
        
        if (updateRequest.getAdditionalRevisionFeeVnd() != null) {
            contract.setAdditionalRevisionFeeVnd(updateRequest.getAdditionalRevisionFeeVnd());
        }
        
        if (updateRequest.getRevisionDeadlineDays() != null) {
            contract.setRevisionDeadlineDays(updateRequest.getRevisionDeadlineDays());
        }
        
        if (updateRequest.getExpiresAt() != null) {
            contract.setExpiresAt(updateRequest.getExpiresAt());
        }
        
        Contract saved = contractRepository.save(contract);
        log.info("Updated contract: contractId={}, requestId={}", saved.getContractId(), saved.getRequestId());
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    /**
     * Check và update expired contracts
     * Contracts đã hết hạn (expiresAt <= now) nhưng chưa signed sẽ được set status = expired
     */
    @Transactional
    public int checkAndUpdateExpiredContracts() {
        Instant now = Instant.now();
        List<Contract> expiredContracts = contractRepository.findExpiredContracts(now);
        
        int updatedCount = 0;
        if (expiredContracts.isEmpty()) {
            log.debug("No expired contracts found");
        } else {
            for (Contract contract : expiredContracts) {
                ContractStatus currentStatus = contract.getStatus();
                
                // Chỉ update những contract đang ở trạng thái SENT hoặc APPROVED
                // (những trạng thái đang chờ customer phản hồi/và duyệt nhưng chưa ký)
                if (currentStatus == ContractStatus.sent || currentStatus == ContractStatus.approved) {
                    contract.setStatus(ContractStatus.expired);
                    contractRepository.save(contract);
                    
                    // Update request status về cancelled (customer không phản hồi)
                    try {
                        requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "cancelled");
                        log.info("Updated request status to cancelled: requestId={}", contract.getRequestId());
                    } catch (Exception e) {
                        log.error("Failed to update request status for expired contract: contractId={}, requestId={}", 
                            contract.getContractId(), contract.getRequestId(), e);
                    }
                    
                    updatedCount++;
                    log.info("Contract expired: contractId={}, contractNumber={}, status={}, expiresAt={}", 
                        contract.getContractId(), contract.getContractNumber(), currentStatus, contract.getExpiresAt());
                } else {
                    log.debug("Skipping contract expiration (not in SENT/APPROVED status): contractId={}, status={}", 
                        contract.getContractId(), currentStatus);
                }
            }
        }

        log.info("Updated {} expired contracts", updatedCount);
        return updatedCount;
    }

    /**
     * Cleanup expired OTP sign sessions to avoid clutter
     * @return number of sessions removed
     */
    @Transactional
    public int cleanupExpiredSignSessions() {
        Instant cutoff = Instant.now();
        int removedSessions = 0;
        removedSessions += contractSignSessionRepository.deleteByStatusAndExpireAtBefore(
                SignSessionStatus.PENDING,
                cutoff
        );
        removedSessions += contractSignSessionRepository.deleteByStatusAndExpireAtBefore(
                SignSessionStatus.CANCELLED,
                cutoff
        );
        removedSessions += contractSignSessionRepository.deleteByStatusAndExpireAtBefore(
                SignSessionStatus.EXPIRED,
                cutoff
        );
        if (removedSessions > 0) {
            log.info("Removed {} expired contract sign sessions", removedSessions);
        } else {
            log.debug("No expired contract sign sessions found for cleanup");
        }
        return removedSessions;
    }
    
    /**
     * Lấy contract theo ID
     * Kiểm tra quyền truy cập: MANAGER chỉ xem được contracts họ quản lý, CUSTOMER chỉ xem được contracts của họ
     */
    @Transactional(readOnly = true)
    public ContractResponse getContractById(String contractId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền truy cập
        checkContractAccess(contract);
        
        ContractResponse response = contractMapper.toResponse(contract);
        
        return enrichWithMilestonesAndInstallments(response);
    }

    /**
     * Lấy milestone theo milestoneId và contractId
     * Kiểm tra quyền truy cập: MANAGER chỉ xem được milestones của contracts họ quản lý
     */
    @Transactional(readOnly = true)
    public ContractMilestoneResponse getMilestoneById(String contractId, String milestoneId) {
        // Load contract để check authorization
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền truy cập
        checkContractAccess(contract);
        
        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(milestoneId, contractId));
        
        return contractMilestoneMapper.toResponse(milestone);
    }
    
    
    /**
     * Enrich ContractResponse với milestones và installments
     */
    private ContractResponse enrichWithMilestonesAndInstallments(ContractResponse response) {
        if (response == null || response.getContractId() == null) {
            return response;
        }
        
        // Load milestones
        List<ContractMilestone> milestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(response.getContractId());
        
        List<ContractMilestoneResponse> milestoneResponses = milestones.stream()
            .map(contractMilestoneMapper::toResponse)
            .collect(Collectors.toList());
        
        response.setMilestones(milestoneResponses);
        
        // Load installments
        List<ContractInstallment> installments = contractInstallmentRepository
            .findByContractIdOrderByCreatedAtAsc(response.getContractId());
        
        List<ContractInstallmentResponse> installmentResponses = installments.stream()
            .map(this::mapToInstallmentResponse)
            .collect(Collectors.toList());
        
        response.setInstallments(installmentResponses);
        
        return response;
    }
    
    /**
     * Manager send contract cho customer
     * Chỉ cho phép send khi contract ở trạng thái DRAFT
     * @param contractId ID của contract
     * @param expiresInDays Số ngày hết hạn (mặc định 7 ngày)
     * @return ContractResponse
     */
    @Transactional
    public ContractResponse sendContractToCustomer(String contractId, Integer expiresInDays) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền: chỉ manager của contract mới được send
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(contract.getManagerUserId())) {
            throw UnauthorizedException.create(
                "Only the contract manager can send this contract");
        }
        
        // Kiểm tra status: chỉ cho phép send khi status = DRAFT
        if (contract.getStatus() != ContractStatus.draft) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId, contract.getStatus(),
                "Chỉ có thể gửi contract khi đang ở trạng thái DRAFT");
        }
        
        // Update status thành SENT
        contract.setStatus(ContractStatus.sent);
        contract.setSentToCustomerAt(Instant.now());
        
        // Set expiresAt (mặc định 7 ngày nếu chưa có)
        if (expiresInDays != null && expiresInDays > 0) {
            contract.setExpiresAt(Instant.now().plusSeconds(expiresInDays * 24L * 60 * 60));
            log.info("Set expiresAt for contract: contractId={}, expiresInDays={}", contractId, expiresInDays);
        } else if (contract.getExpiresAt() == null) {
            // Mặc định 7 ngày nếu không chỉ định và chưa có
            int defaultDays = 7;
            contract.setExpiresAt(Instant.now().plusSeconds(defaultDays * 24L * 60 * 60));
            log.info("Set expiresAt for contract (default 7 days): contractId={}", contractId);
        }
        
        Contract saved = contractRepository.save(contract);
        log.info("Manager sent contract to customer: contractId={}, managerId={}, customerId={}", 
            contractId, currentUserId, contract.getUserId());
        
        // Cập nhật request status thành "contract_sent"
        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "contract_sent");
            log.info("Updated request status to contract_sent: requestId={}, contractId={}", 
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to update request status to contract_sent: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }
        
        // Gửi notification cho customer
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getUserId())
                    .type(NotificationType.CONTRACT_SENT)
                    .title("Contract mới đã được gửi")
                    .content(String.format("Contract #%s đã được gửi cho bạn. Vui lòng xem xét và phản hồi.", 
                            contract.getContractNumber()))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/contracts/" + contractId)
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent notification to customer: userId={}, contractId={}", 
                    contract.getUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send notification: userId={}, contractId={}, error={}", 
                    contract.getUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room
        String systemMessage = String.format(
            "📄 Manager đã gửi contract #%s cho bạn. Vui lòng xem xét và phản hồi trong vòng %d ngày.",
            contract.getContractNumber(),
            expiresInDays != null ? expiresInDays : 7
        );
        sendSystemMessageToChat(contract.getRequestId(), systemMessage);
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    /**
     * Lấy danh sách contracts theo requestId
     * - CUSTOMER: chỉ trả về contracts đã được gửi cho customer VÀ là contracts của họ
     * - MANAGER: chỉ trả về contracts mà họ quản lý (managerUserId == currentUserId)
     * - SYSTEM_ADMIN: trả về tất cả contracts (không filter)
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> getContractsByRequestId(String requestId) {
        List<Contract> contracts = contractRepository.findByRequestId(requestId);
        
        // Lấy role của user hiện tại
        List<String> userRoles = getCurrentUserRoles();
        String currentUserId = getCurrentUserId();
        boolean isCustomer = hasRole(userRoles, "CUSTOMER");
        boolean isManager = hasRole(userRoles, "MANAGER");
        boolean isSystemAdmin = hasRole(userRoles, "SYSTEM_ADMIN");
        
        // Filter theo role
        if (isCustomer && !isSystemAdmin) {
            // Customer: chỉ hiển thị contracts đã được gửi cho customer VÀ là contracts của họ
            contracts = contracts.stream()
                .filter(contract -> {
                    // Chỉ hiển thị nếu contract đã được gửi cho customer
                    return contract.getSentToCustomerAt() != null 
                        && contract.getUserId() != null 
                        && contract.getUserId().equals(currentUserId);
                })
                .collect(Collectors.toList());
        } else if (isManager && !isSystemAdmin) {
            // Manager: chỉ hiển thị contracts mà họ quản lý
            contracts = contracts.stream()
                .filter(contract -> {
                    return contract.getManagerUserId() != null 
                        && contract.getManagerUserId().equals(currentUserId);
                })
                .collect(Collectors.toList());
        }
        // SYSTEM_ADMIN: xem tất cả contracts (không filter)
        
        return contracts.stream()
            .map(contractMapper::toResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy danh sách contracts của user hiện tại
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> getMyContracts() {
        String userId = getCurrentUserId();
        List<Contract> contracts = contractRepository.findByUserId(userId);
        return contracts.stream()
            .map(contractMapper::toResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy danh sách contracts được quản lý bởi manager hiện tại
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> getMyManagedContracts() {
        String managerId = getCurrentUserId();
        List<Contract> contracts = contractRepository.findByManagerUserId(managerId);
        return contracts.stream()
            .map(contractMapper::toResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy thông tin contract cho nhiều requestIds
     * hasContract = true nếu có ít nhất 1 contract active
     * Filter theo role: MANAGER chỉ thấy contracts họ quản lý, CUSTOMER chỉ thấy contracts của họ
     * @param requestIds Danh sách request IDs
     * @return Map với key là requestId, value là RequestContractInfo
     */
    @Transactional(readOnly = true)
    public Map<String, RequestContractInfo> getContractInfoByRequestIds(List<String> requestIds) {
        Map<String, RequestContractInfo> result = new HashMap<>();
        
        if (requestIds == null || requestIds.isEmpty()) {
            return result;
        }
        
        // 1 query duy nhất: Lấy contracts active hoặc latest cho tất cả requestIds
        List<Contract> contracts = contractRepository.findActiveOrLatestContractsByRequestIds(requestIds);
        
        // Filter theo role
        List<String> userRoles = getCurrentUserRoles();
        String currentUserId = getCurrentUserId();
        boolean isManager = hasRole(userRoles, "MANAGER");
        boolean isSystemAdmin = hasRole(userRoles, "SYSTEM_ADMIN");
        boolean isCustomer = hasRole(userRoles, "CUSTOMER");
        
        if (isManager && !isSystemAdmin) {
            // Manager: chỉ contracts họ quản lý
            contracts = contracts.stream()
                .filter(contract -> contract.getManagerUserId() != null 
                    && contract.getManagerUserId().equals(currentUserId))
                .collect(Collectors.toList());
        } else if (isCustomer && !isSystemAdmin) {
            // Customer: chỉ contracts của họ
            contracts = contracts.stream()
                .filter(contract -> contract.getUserId() != null 
                    && contract.getUserId().equals(currentUserId))
                .collect(Collectors.toList());
        }
        // SYSTEM_ADMIN: xem tất cả (không filter)
        
        // Group by requestId (mỗi requestId chỉ lấy contract đầu tiên - đã sort)
        Map<String, Contract> contractMap = new HashMap<>();
        for (Contract contract : contracts) {
            contractMap.putIfAbsent(contract.getRequestId(), contract);
        }
        
        // Build result map
        for (String requestId : requestIds) {
            Contract contract = contractMap.get(requestId);
            
            boolean hasActiveContract = contract != null && (
                contract.getStatus() == ContractStatus.draft 
                || contract.getStatus() == ContractStatus.sent 
                || contract.getStatus() == ContractStatus.approved 
                || contract.getStatus() == ContractStatus.signed
                || contract.getStatus() == ContractStatus.active
                || contract.getStatus() == ContractStatus.active_pending_assignment
            );
            
            Contract displayContract = contract;
            
            result.put(requestId, RequestContractInfo.builder()
                .requestId(requestId)
                .hasContract(hasActiveContract)
                .contractId(displayContract != null ? displayContract.getContractId() : null)
                .contractStatus(displayContract != null && displayContract.getStatus() != null 
                    ? displayContract.getStatus().name() : null)
                .build());
        }
        
        return result;
    }
    
    /**
     * Customer approve contract
     * Chỉ cho phép khi contract ở trạng thái SENT
     * @param contractId ID của contract
     * @return ContractResponse
     */
    @Transactional
    public ContractResponse approveContract(String contractId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền: chỉ customer (owner) mới được approve
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(contract.getUserId())) {
            throw UnauthorizedException.create(
                "Only the contract owner can approve this contract");
        }
        
        // Kiểm tra status: chỉ cho phép approve khi status = SENT
        if (contract.getStatus() != ContractStatus.sent) {
            throw InvalidContractStatusException.cannotApprove(
                contractId, contract.getStatus());
        }
        
        // Check expired
        if (contract.getExpiresAt() != null && contract.getExpiresAt().isBefore(Instant.now())) {
            throw ContractExpiredException.cannotSign(contract.getContractId(), contract.getExpiresAt());
        }
        
        // Update status - CHỈ set APPROVED, chưa ký
        contract.setStatus(ContractStatus.approved);
        contract.setCustomerReviewedAt(Instant.now());
        // KHÔNG set signedAt ở đây - phải ký qua OTP flow (init-esign + verify-otp)
        // DEPOSIT installment sẽ được chuyển sang DUE khi contract được ký (trong verifyOTPAndSign)
        
        Contract saved = contractRepository.save(contract);
        log.info("Customer approved contract: contractId={}, userId={}", contractId, currentUserId);
        
        // Cập nhật request status thành "contract_approved"
        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "contract_approved");
            log.info("Updated request status to contract_approved: requestId={}, contractId={}", 
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to update request status: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }
        
        // Gửi notification cho manager
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getManagerUserId())
                    .type(NotificationType.CONTRACT_APPROVED)
                    .title("Contract đã được duyệt")
                    .content(String.format("Customer đã duyệt contract #%s. Vui lòng chờ customer ký để bắt đầu thực hiện.", 
                            contract.getContractNumber()))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts")
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent notification to manager: userId={}, contractId={}", 
                    contract.getManagerUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room
        String systemMessage = String.format(
            "✅ Customer đã duyệt contract #%s. Đang chờ ký để bắt đầu thực hiện.",
            contract.getContractNumber()
        );
        sendSystemMessageToChat(contract.getRequestId(), systemMessage);
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    
    /**
     * Customer request change (yêu cầu chỉnh sửa)
     * Chỉ cho phép khi contract ở trạng thái SENT
     * @param contractId ID của contract
     * @param request DTO chứa lý do yêu cầu chỉnh sửa
     * @return ContractResponse
     */
    @Transactional
    public ContractResponse requestChangeContract(String contractId, CustomerActionRequest request) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền: chỉ customer (owner) mới được request change
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(contract.getUserId())) {
            throw UnauthorizedException.create(
                "Only the contract owner can request changes to this contract");
        }
        
        // Kiểm tra status: chỉ cho phép khi status = SENT
        if (contract.getStatus() != ContractStatus.sent) {
            throw InvalidContractStatusException.cannotRequestChange(
                contractId, contract.getStatus());
        }
        
        // Validate reason
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw MissingReasonException.forRequestChange();
        }
        
        // Update status và lưu lý do
        contract.setStatus(ContractStatus.need_revision);
        contract.setCancellationReason(request.getReason());
        contract.setCustomerReviewedAt(Instant.now());
        
        Contract saved = contractRepository.save(contract);
        log.info("Customer requested change for contract: contractId={}, userId={}, reason={}", 
            contractId, currentUserId, request.getReason());
        
        // Update request status về "pending" để manager tạo contract mới
        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "pending");
            log.info("Updated request status to pending: requestId={}, contractId={}", 
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            log.error("Failed to update request status: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }
        
        // Gửi notification cho manager
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getManagerUserId())
                    .type(NotificationType.CONTRACT_NEED_REVISION)
                    .title("Customer yêu cầu chỉnh sửa Contract")
                    .content(String.format("Customer đã yêu cầu chỉnh sửa contract #%s. Lý do: %s", 
                            contract.getContractNumber(), request.getReason()))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts")
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent notification to manager: userId={}, contractId={}", 
                    contract.getManagerUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room
        String systemMessage = String.format(
            "✏️ Customer yêu cầu chỉnh sửa contract #%s.\nLý do: %s",
            contract.getContractNumber(),
            request.getReason()
        );
        sendSystemMessageToChat(contract.getRequestId(), systemMessage);
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    /**
     * Customer cancel contract
     * Chỉ cho phép khi contract ở trạng thái SENT
     * Không cho phép hủy khi đã APPROVED
     * @param contractId ID của contract
     * @param request DTO chứa lý do hủy
     * @return ContractResponse
     */
    @Transactional
    public ContractResponse cancelContract(String contractId, CustomerActionRequest request) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền: chỉ customer (owner) mới được hủy
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(contract.getUserId())) {
            throw UnauthorizedException.create(
                "Only the contract owner can cancel this contract");
        }
        
        // Kiểm tra status: chỉ cho phép hủy khi status = SENT
        // Không cho phép hủy khi đã APPROVED, SIGNED, ACTIVE hoặc đã bắt đầu thực hiện
        if (contract.getStatus() != ContractStatus.sent) {
            if (contract.getStatus() == ContractStatus.approved || 
                contract.getStatus() == ContractStatus.signed ||
                contract.getStatus() == ContractStatus.active ||
                contract.getStatus() == ContractStatus.active_pending_assignment) {
                throw InvalidContractStatusException.cannotCancel(
                    contractId, contract.getStatus(),
                    "Contract đã được approve, đã ký hoặc đã active. Không thể hủy trực tiếp. Vui lòng liên hệ support để yêu cầu hủy hợp đồng.");
            }
            throw InvalidContractStatusException.cannotCancel(
                contractId, contract.getStatus(),
                "Chỉ có thể hủy contract khi đang ở trạng thái SENT (chưa được approve).");
        }
        
        // Validate reason
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw MissingReasonException.forCancellation();
        }
        
        // Update status và lưu lý do
        contract.setStatus(ContractStatus.canceled_by_customer);
        contract.setCancellationReason(request.getReason());
        contract.setCustomerReviewedAt(Instant.now());
        
        Contract saved = contractRepository.save(contract);
        log.info("Customer canceled contract: contractId={}, userId={}, reason={}", 
            contractId, currentUserId, request.getReason());
        
        // Update request status về "cancelled" vì customer đã hủy
        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "cancelled");
            log.info("Updated request status to cancelled: requestId={}, contractId={}", 
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            log.error("Failed to update request status: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }
        
        // Gửi notification cho manager
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getManagerUserId())
                    .type(NotificationType.CONTRACT_CANCELED_BY_CUSTOMER)
                    .title("Customer đã hủy Contract")
                    .content(String.format("Customer đã hủy contract #%s. Lý do: %s", 
                            contract.getContractNumber(), request.getReason()))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts")
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent notification to manager: userId={}, contractId={}", 
                    contract.getManagerUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room
        String systemMessage = String.format(
            "❌ Customer đã hủy contract #%s.\nLý do: %s",
            contract.getContractNumber(),
            request.getReason()
        );
        sendSystemMessageToChat(contract.getRequestId(), systemMessage);
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    /**
     * Manager cancel contract
     * Manager có thể hủy contract khi ở trạng thái DRAFT hoặc SENT
     * Khi đã SENT, manager vẫn có thể hủy nhưng phải thông báo cho customer
     * Không cho phép hủy khi đã APPROVED hoặc SIGNED (đã bắt đầu thực hiện)
     * @param contractId ID của contract
     * @param request DTO chứa lý do hủy
     * @return ContractResponse
     */
    @Transactional
    public ContractResponse cancelContractByManager(String contractId, CustomerActionRequest request) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền: chỉ manager của contract mới được hủy
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(contract.getManagerUserId())) {
            throw UnauthorizedException.create(
                "Only the contract manager can cancel this contract");
        }
        
        // Kiểm tra status: không cho phép hủy khi đã APPROVED, SIGNED hoặc ACTIVE
        // Cho phép hủy khi DRAFT hoặc SENT
        if (contract.getStatus() == ContractStatus.approved || 
            contract.getStatus() == ContractStatus.signed ||
            contract.getStatus() == ContractStatus.active ||
            contract.getStatus() == ContractStatus.active_pending_assignment) {
            throw InvalidContractStatusException.cannotCancel(
                contractId, contract.getStatus(),
                "Contract đã được approve, đã ký hoặc đã active. Không thể hủy. Vui lòng liên hệ support để xử lý.");
        }
        
        // Nếu contract đã SENT, log để biết cần thông báo cho customer
        boolean wasSent = contract.getStatus() == ContractStatus.sent;
        if (wasSent) {
            log.info("Manager canceling contract that was already SENT to customer: contractId={}, customerId={}", 
                contractId, contract.getUserId());
        }
        
        // Validate reason
        if (request.getReason() == null || request.getReason().isBlank()) {
            throw MissingReasonException.forCancellation();
        }
        
        // Update status và lưu lý do
        contract.setStatus(ContractStatus.canceled_by_manager);
        contract.setCancellationReason(request.getReason());
        
        Contract saved = contractRepository.save(contract);
        log.info("Manager canceled contract: contractId={}, managerId={}, reason={}, wasSent={}", 
            contractId, currentUserId, request.getReason(), wasSent);
        
        // Nếu contract đã được gửi cho customer, gửi system message và notification
        if (wasSent) {
            // Gửi system message vào chat room
            String systemMessage = String.format(
                "🚫 Manager đã thu hồi contract #%s.\nLý do: %s",
                contract.getContractNumber(),
                request.getReason()
            );
            sendSystemMessageToChat(contract.getRequestId(), systemMessage);
            
            // Gửi notification cho customer về việc manager hủy contract
            try {
                CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                        .userId(contract.getUserId())
                        .type(NotificationType.CONTRACT_CANCELED_BY_MANAGER)
                        .title("Contract đã bị thu hồi")
                        .content(String.format("Manager đã thu hồi contract #%s. Lý do: %s", 
                                contract.getContractNumber(), request.getReason()))
                        .referenceId(contractId)
                        .referenceType("CONTRACT")
                        .actionUrl("/contracts/" + contractId)
                        .build();
                
                notificationServiceFeignClient.createNotification(notifRequest);
                log.info("Sent notification to customer: userId={}, contractId={}", 
                        contract.getUserId(), contractId);
            } catch (Exception e) {
                log.error("Failed to send notification: userId={}, contractId={}, error={}", 
                        contract.getUserId(), contractId, e.getMessage(), e);
            }
            
            log.info("Contract was SENT to customer before cancellation. Notification sent: contractId={}, customerId={}", 
                contractId, contract.getUserId());
        }
        
        // Update request status về "pending" để có thể tạo contract mới
        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "pending");
            log.info("Updated request status to pending after manager cancellation: requestId={}, contractId={}", 
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            log.error("Failed to update request status: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    /**
     * Xử lý khi DEPOSIT được thanh toán
     * @param contractId ID của contract
     * @param installmentId ID của DEPOSIT installment
     * @param paidAt Thời điểm thanh toán
     */
    @Transactional
    public void handleDepositPaid(String contractId, String installmentId, Instant paidAt) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Validation: Contract phải ở trạng thái signed để cho phép thanh toán deposit
        ContractStatus contractStatus = contract.getStatus();
        if (contractStatus != ContractStatus.signed) {
            log.warn("❌ Cannot pay deposit: contract must be signed. " +
                "contractId={}, installmentId={}, currentContractStatus={}", 
                contractId, installmentId, contractStatus);
            throw MilestonePaymentException.contractNotActive(contractId, null, null, contractStatus);
        }
        
        // Tìm DEPOSIT installment
        ContractInstallment depositInstallment = contractInstallmentRepository.findById(installmentId)
            .orElseThrow(() -> ContractInstallmentNotFoundException.byId(installmentId));
        
        // Validate installment type
        if (depositInstallment.getType() != InstallmentType.DEPOSIT) {
            throw InvalidInstallmentTypeException.notDepositType(installmentId, depositInstallment.getType());
        }
        
        // Update installment status
        depositInstallment.setStatus(InstallmentStatus.PAID);
        depositInstallment.setPaidAt(paidAt);
        contractInstallmentRepository.save(depositInstallment);
        log.info("Updated DEPOSIT installment to PAID: contractId={}, installmentId={}", 
            contractId, installmentId);
        
        // Gửi notification cho manager
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getManagerUserId())
                    .type(NotificationType.MILESTONE_PAID)
                    .title("Deposit đã được thanh toán")
                    .content(String.format("Customer đã thanh toán deposit cho contract #%s. Số tiền: %s %s", 
                            contract.getContractNumber(),
                            depositInstallment.getAmount().toPlainString(),
                            contract.getCurrency() != null ? contract.getCurrency() : "VND"))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts/" + contractId)
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent deposit paid notification to manager: userId={}, contractId={}", 
                    contract.getManagerUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send deposit paid notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room
        String systemMessage = String.format(
            "💰 Customer đã thanh toán deposit cho contract #%s.\nSố tiền: %s %s",
            contract.getContractNumber(),
            depositInstallment.getAmount().toPlainString(),
            contract.getCurrency() != null ? contract.getCurrency() : "VND"
        );
        sendSystemMessageToChat(contract.getRequestId(), systemMessage);
        
        contract.setDepositPaidAt(paidAt);

        // Nếu contract status = signed, chuyển sang trạng thái chờ assign/start
        if (contract.getStatus() == ContractStatus.signed) {
            contract.setStatus(ContractStatus.active_pending_assignment);
            contractRepository.save(contract);
            log.info("Contract moved to ACTIVE_PENDING_ASSIGNMENT after deposit: contractId={}, depositPaidAt={}",
                contractId, paidAt);

            // Đồng bộ trạng thái request: đã đặt cọc, chờ manager gán task/bắt đầu công việc
            try {
                requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "awaiting_assignment");
                log.info("Updated request status to awaiting_assignment after deposit paid: requestId={}, contractId={}",
                    contract.getRequestId(), contractId);
            } catch (Exception e) {
                log.error("Failed to update request status to awaiting_assignment after deposit paid: requestId={}, contractId={}, error={}",
                    contract.getRequestId(), contractId, e.getMessage(), e);
            }
        }
    }

    /**
     * Manager xác nhận đã assign xong và bắt đầu thực thi contract.
     */
    @Transactional
    public ContractResponse startContractWork(String contractId, Instant requestedStartAt) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));

        if (contract.getStatus() != ContractStatus.active_pending_assignment) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId,
                contract.getStatus(),
                "Contract is not in ACTIVE_PENDING_ASSIGNMENT state. Current status: " + contract.getStatus()
            );
        }

        if (contract.getDepositPaidAt() == null) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId,
                contract.getStatus(),
                "Cannot start work before deposit is paid."
            );
        }

        Instant startAt = requestedStartAt != null ? requestedStartAt : Instant.now();
        if (startAt.isBefore(contract.getDepositPaidAt())) {
            startAt = contract.getDepositPaidAt();
        }

        contract.setWorkStartAt(startAt);
        contract.setExpectedStartDate(startAt);

        // Lấy milestone 1 trước để activate task assignments sau
        String firstMilestoneId = contractMilestoneRepository
            .findByContractIdAndOrderIndex(contractId, 1)
            .map(ContractMilestone::getMilestoneId)
            .orElse(null);

        calculatePlannedDatesForAllMilestones(contractId, startAt, true); // true = unlock milestone 1
        
        // Activate task assignments cho milestone 1 sau khi đã unlock
        if (firstMilestoneId != null) {
            taskAssignmentService.activateAssignmentsForMilestone(contractId, firstMilestoneId);
        }

        contract.setStatus(ContractStatus.active);
        Contract saved = contractRepository.save(contract);

        try {
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "in_progress");
            log.info("Updated request status to in_progress after work start: requestId={}, contractId={}",
                contract.getRequestId(), contractId);
        } catch (Exception e) {
            log.error("Failed to update request status to in_progress after work start: requestId={}, contractId={}, error={}",
                contract.getRequestId(), contractId, e.getMessage(), e);
        }

        log.info("Contract work started: contractId={}, workStartAt={}", contractId, startAt);
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestonesAndInstallments(response);
    }
    
    /**
     * Xử lý khi milestone được thanh toán
     * @param contractId ID của contract
     * @param milestoneId ID của milestone được thanh toán
     * @param orderIndex Thứ tự milestone (1, 2, 3...)
     * @param paidAt Thời điểm thanh toán
     */
    @Transactional
    public void handleMilestonePaid(String contractId, String milestoneId, Integer orderIndex, Instant paidAt) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Validation: Contract phải ở trạng thái signed hoặc active để cho phép thanh toán
        ContractStatus contractStatus = contract.getStatus();
        if (contractStatus != ContractStatus.signed 
                && contractStatus != ContractStatus.active 
                && contractStatus != ContractStatus.active_pending_assignment) {
            log.warn("❌ Cannot pay milestone: contract must be signed or active. " +
                "contractId={}, milestoneId={}, orderIndex={}, currentContractStatus={}", 
                contractId, milestoneId, orderIndex, contractStatus);
            throw MilestonePaymentException.contractNotActive(contractId, milestoneId, orderIndex, contractStatus);
        }
        
        // Tìm milestone và installment
        ContractMilestone milestone = contractMilestoneRepository.findById(milestoneId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(milestoneId, contractId));
        
        ContractInstallment installment = contractInstallmentRepository.findByContractIdAndMilestoneId(contractId, milestoneId)
            .orElseThrow(() -> ContractInstallmentNotFoundException.forMilestone(milestoneId, contractId));
        
        // Validation: Milestone chỉ được thanh toán khi work status = READY_FOR_PAYMENT hoặc COMPLETED
        MilestoneWorkStatus workStatus = milestone.getWorkStatus();
        if (workStatus != MilestoneWorkStatus.READY_FOR_PAYMENT 
            && workStatus != MilestoneWorkStatus.COMPLETED) {
            log.warn("❌ Cannot pay milestone: milestone must be READY_FOR_PAYMENT or COMPLETED. " +
                "contractId={}, milestoneId={}, orderIndex={}, currentWorkStatus={}", 
                contractId, milestoneId, orderIndex, workStatus);
            throw MilestonePaymentException.milestoneNotCompleted(contractId, milestoneId, orderIndex, workStatus);
        }

        // Update installment status
        installment.setStatus(InstallmentStatus.PAID);
        installment.setPaidAt(paidAt);
        contractInstallmentRepository.save(installment);
        log.info("Updated milestone installment to PAID: contractId={}, installmentId={}, milestoneId={}", 
            contractId, installment.getInstallmentId(), milestoneId);
        
        contractMilestoneRepository.save(milestone);

        milestoneProgressService.markActualEnd(contractId, milestoneId, paidAt);
        
        // Gửi notification cho manager
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getManagerUserId())
                    .type(NotificationType.MILESTONE_PAID)
                    .title("Milestone đã được thanh toán")
                    .content(String.format("Customer đã thanh toán milestone \"%s\" cho contract #%s. Số tiền: %s %s", 
                            milestone.getName(), 
                            contract.getContractNumber(),
                            installment.getAmount().toPlainString(),
                            contract.getCurrency() != null ? contract.getCurrency() : "VND"))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts/" + contractId)
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent milestone paid notification to manager: userId={}, contractId={}, milestoneId={}", 
                    contract.getManagerUserId(), contractId, milestoneId);
        } catch (Exception e) {
            log.error("Failed to send milestone paid notification: userId={}, contractId={}, milestoneId={}, error={}", 
                    contract.getManagerUserId(), contractId, milestoneId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room
        String systemMessage = String.format(
            "💰 Customer đã thanh toán milestone \"%s\" cho contract #%s.\nSố tiền: %s %s",
            milestone.getName(),
            contract.getContractNumber(),
            installment.getAmount().toPlainString(),
            contract.getCurrency() != null ? contract.getCurrency() : "VND"
        );
        sendSystemMessageToChat(contract.getRequestId(), systemMessage);
        
        // Tự động unlock milestone tiếp theo: Khi milestone N được thanh toán → milestone N+1 READY_TO_START
        if (orderIndex > 0) {
            Optional<ContractMilestone> nextMilestoneOpt = contractMilestoneRepository
                .findByContractIdAndOrderIndex(contractId, orderIndex + 1);
            
            if (nextMilestoneOpt.isPresent()) {
                ContractMilestone nextMilestone = nextMilestoneOpt.get();
                
                // Milestone tiếp theo chuyển sang READY_TO_START để chờ manager/specialist bắt đầu thực tế
                if (nextMilestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
                    nextMilestone.setWorkStatus(MilestoneWorkStatus.READY_TO_START);
                    contractMilestoneRepository.save(nextMilestone);
                    log.info("Milestone unlocked and READY_TO_START: contractId={}, milestoneId={}, orderIndex={}", 
                        contractId, nextMilestone.getMilestoneId(), nextMilestone.getOrderIndex());
                }

                taskAssignmentService.activateAssignmentsForMilestone(contractId, nextMilestone.getMilestoneId());
            }
        }
        
        // Kiểm tra xem tất cả installments đã được thanh toán chưa
        List<ContractInstallment> allInstallments = contractInstallmentRepository
            .findByContractIdOrderByCreatedAtAsc(contractId);
        
        boolean allInstallmentsPaid = allInstallments.stream()
            .allMatch(i -> i.getStatus() == InstallmentStatus.PAID);
        
        if (allInstallmentsPaid && (contract.getStatus() == ContractStatus.active 
                || contract.getStatus() == ContractStatus.active_pending_assignment)) {
            // Tất cả installments đã được thanh toán → contract completed
        contractRepository.save(contract);
            log.info("All installments paid for contract: contractId={}, allInstallmentsCount={}", 
                contractId, allInstallments.size());
            
            // Update work status của milestone cuối cùng thành COMPLETED
            List<ContractMilestone> allMilestones = contractMilestoneRepository
                .findByContractIdOrderByOrderIndexAsc(contractId);
            if (!allMilestones.isEmpty()) {
                ContractMilestone lastMilestone = allMilestones.get(allMilestones.size() - 1);
                if (lastMilestone.getWorkStatus() != MilestoneWorkStatus.COMPLETED) {
                    lastMilestone.setWorkStatus(MilestoneWorkStatus.COMPLETED);
                    contractMilestoneRepository.save(lastMilestone);
                }
            }
            
            // Update request status to COMPLETED khi tất cả milestones đã được thanh toán
            try {
                requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "completed");
                log.info("Updated request status to completed: requestId={}, contractId={}", 
                    contract.getRequestId(), contractId);
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to update request status to completed: requestId={}, contractId={}, error={}", 
                    contract.getRequestId(), contractId, e.getMessage(), e);
            }
            
            // Gửi notification cho manager khi tất cả milestones đã được thanh toán
            try {
                CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                        .userId(contract.getManagerUserId())
                        .type(NotificationType.ALL_MILESTONES_PAID)
                        .title("Tất cả milestones đã được thanh toán")
                        .content(String.format("Customer đã thanh toán tất cả milestones cho contract #%s. Contract đã hoàn thành thanh toán.", 
                                contract.getContractNumber()))
                        .referenceId(contractId)
                        .referenceType("CONTRACT")
                        .actionUrl("/manager/contracts/" + contractId)
                        .build();
                
                notificationServiceFeignClient.createNotification(notifRequest);
                log.info("Sent all milestones paid notification to manager: userId={}, contractId={}", 
                        contract.getManagerUserId(), contractId);
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to send all milestones paid notification: userId={}, contractId={}, error={}", 
                        contract.getManagerUserId(), contractId, e.getMessage(), e);
            }
            
            // Gửi system message vào chat room khi tất cả milestones đã được thanh toán
            String allPaidMessage = String.format(
                "✅ Customer đã thanh toán tất cả milestones cho contract #%s. Contract đã hoàn thành thanh toán.",
                contract.getContractNumber()
            );
            sendSystemMessageToChat(contract.getRequestId(), allPaidMessage);
        }
    }
    
    
    /**
     * Validate milestone SLA days: sum(milestoneSlaDays) = contract slaDays
     */
    private void validateMilestoneSlaDays(Integer contractSlaDays, List<CreateMilestoneRequest> milestones) {
        if (contractSlaDays == null || contractSlaDays <= 0) {
            throw ContractValidationException.invalidContractSlaDays();
        }
        
        if (milestones == null || milestones.isEmpty()) {
            throw ContractValidationException.noMilestones();
        }
        
        int totalMilestoneSlaDays = 0;
        for (CreateMilestoneRequest milestone : milestones) {
            if (milestone.getMilestoneSlaDays() == null || milestone.getMilestoneSlaDays() <= 0) {
                throw ContractValidationException.missingMilestoneSlaDays(milestone.getName());
            }
            totalMilestoneSlaDays += milestone.getMilestoneSlaDays();
        }
        
        if (totalMilestoneSlaDays != contractSlaDays) {
            throw ContractValidationException.invalidMilestoneSlaDays(contractSlaDays, totalMilestoneSlaDays);
        }
    }
    
    /**
     * Validate: depositPercent + sum(paymentPercent của milestones có hasPayment=true) = 100%
     */
    private void validatePaymentPercentages(BigDecimal depositPercent, List<CreateMilestoneRequest> milestones) {
        if (depositPercent == null || depositPercent.compareTo(BigDecimal.ZERO) <= 0) {
            throw ContractValidationException.invalidDepositPercent();
        }
        
        BigDecimal totalPaymentPercent = depositPercent;
        
        for (CreateMilestoneRequest milestone : milestones) {
            if (milestone.getHasPayment() != null && milestone.getHasPayment()) {
                if (milestone.getPaymentPercent() == null || milestone.getPaymentPercent().compareTo(BigDecimal.ZERO) <= 0) {
                    throw ContractValidationException.missingPaymentPercent(milestone.getName());
                }
                totalPaymentPercent = totalPaymentPercent.add(milestone.getPaymentPercent());
            }
        }
        
        BigDecimal expectedTotal = BigDecimal.valueOf(100);
        if (totalPaymentPercent.compareTo(expectedTotal) != 0) {
            BigDecimal milestonePaymentPercent = totalPaymentPercent.subtract(depositPercent);
            throw ContractValidationException.invalidPaymentPercentages(
                depositPercent.toPlainString(),
                totalPaymentPercent.toPlainString(),
                milestonePaymentPercent.toPlainString()
            );
        }
    }
    
    /**
     * Tạo installments cho contract theo quy tắc mới
     * @param contract Contract đã được tạo
     * @param depositPercent Phần trăm cọc
     * @param milestoneRequests Danh sách milestone requests (để lấy paymentPercent)
     * @param createdMilestones Danh sách milestones đã tạo (để gắn milestone_id)
     */
    private void createInstallmentsForContract(Contract contract, BigDecimal depositPercent, 
            List<CreateMilestoneRequest> milestoneRequests, List<ContractMilestone> createdMilestones) {
        String contractId = contract.getContractId();
        BigDecimal totalPrice = contract.getTotalPrice() != null ? contract.getTotalPrice() : BigDecimal.ZERO;
        CurrencyType currency = contract.getCurrency() != null 
            ? contract.getCurrency() 
            : CurrencyType.VND;
        
        List<ContractInstallment> installments = new java.util.ArrayList<>();
        
        // 1. Tạo DEPOSIT installment (bắt buộc, milestone_id = NULL)
        BigDecimal depositAmount = totalPrice.multiply(depositPercent)
            .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        
        installments.add(ContractInstallment.builder()
            .contractId(contractId)
            .type(InstallmentType.DEPOSIT)
            .milestoneId(null)  // DEPOSIT không gắn với milestone
            .label("Deposit")
            .percent(depositPercent)
            .dueDate(contract.getExpectedStartDate() != null 
                ? contract.getExpectedStartDate().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime()
                : null)
            .amount(depositAmount)
            .currency(currency)
            .status(InstallmentStatus.PENDING)  // Sẽ chuyển thành DUE khi contract được accept/ký
            .gateCondition(GateCondition.BEFORE_START)
            .build());
        
        // 2. Tạo installments cho các milestones có hasPayment = true
        // Tạo map milestone orderIndex -> milestoneId để dễ tra cứu
        Map<Integer, String> milestoneMap = createdMilestones.stream()
            .collect(Collectors.toMap(
                ContractMilestone::getOrderIndex,
                ContractMilestone::getMilestoneId
            ));
        
        if (milestoneRequests != null) {
            for (CreateMilestoneRequest milestoneRequest : milestoneRequests) {
                if (milestoneRequest.getHasPayment() != null && milestoneRequest.getHasPayment()) {
                    String milestoneId = milestoneMap.get(milestoneRequest.getOrderIndex());
                    if (milestoneId == null) {
                        log.warn("Milestone with orderIndex {} not found in created milestones", milestoneRequest.getOrderIndex());
                        continue;
                    }
                    
                    BigDecimal paymentPercent = milestoneRequest.getPaymentPercent();
                    BigDecimal paymentAmount = totalPrice.multiply(paymentPercent)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                    
                    // Xác định type: FINAL nếu là milestone cuối cùng, INTERMEDIATE nếu không
                    InstallmentType installmentType = milestoneRequest.getOrderIndex().equals(
                        milestoneRequests.stream().mapToInt(CreateMilestoneRequest::getOrderIndex).max().orElse(0))
                        ? InstallmentType.FINAL : InstallmentType.INTERMEDIATE;
                    
                    installments.add(ContractInstallment.builder()
                        .contractId(contractId)
                        .type(installmentType)
                        .milestoneId(milestoneId)
                        .label("Milestone " + milestoneRequest.getOrderIndex() + " Payment")
                        .percent(paymentPercent)
                        .dueDate(null)  // Sẽ được tính khi contract có start date
                        .amount(paymentAmount)
                        .currency(currency)
                        .status(InstallmentStatus.PENDING)
                        .gateCondition(GateCondition.AFTER_MILESTONE_DONE)
                        .build());
                }
            }
        }
        
        if (!installments.isEmpty()) {
            contractInstallmentRepository.saveAll(installments);
            log.info("Created {} installments for contract: contractId={}", 
                installments.size(), contractId);
        }
    }
    
    /**
     * Tạo milestones từ request khi tạo contract
     * @param contract Contract đã được tạo
     * @param milestoneRequests Danh sách milestones từ request
     * @return Danh sách milestones đã tạo
     */
    private List<ContractMilestone> createMilestonesFromRequest(Contract contract, List<CreateMilestoneRequest> milestoneRequests) {
        String contractId = contract.getContractId();
        
        List<ContractMilestone> milestones = new java.util.ArrayList<>();
        
        for (CreateMilestoneRequest milestoneRequest : milestoneRequests) {
            ContractMilestone milestone = ContractMilestone.builder()
                .contractId(contractId)
                .orderIndex(milestoneRequest.getOrderIndex())
                .name(milestoneRequest.getName())
                .description(milestoneRequest.getDescription())
                .workStatus(MilestoneWorkStatus.PLANNED)
                .hasPayment(milestoneRequest.getHasPayment() != null ? milestoneRequest.getHasPayment() : false)
                .milestoneSlaDays(milestoneRequest.getMilestoneSlaDays())
                .build();
            
            milestones.add(milestone);
        }
        
        if (!milestones.isEmpty()) {
            List<ContractMilestone> saved = contractMilestoneRepository.saveAll(milestones);
            log.info("Created {} milestones from request for contract: contractId={}", 
                milestones.size(), contractId);
            return saved;
        }
        return new java.util.ArrayList<>();
    }
    
    /**
     * Tính plannedStartAt/plannedDueDate cho toàn bộ milestones dựa trên expectedStartDate (baseline cố định).
     * @param unlockFirstMilestone nếu true, set milestone đầu tiên thành READY_TO_START
     */
    private void calculatePlannedDatesForAllMilestones(String contractId, Instant contractStartAt, boolean unlockFirstMilestone) {
        List<ContractMilestone> milestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        if (milestones.isEmpty()) {
            log.warn("No milestones found when calculating planned dates: contractId={}", contractId);
            return;
        }

        LocalDateTime cursor = contractStartAt.atZone(ZoneId.systemDefault()).toLocalDateTime();
        for (ContractMilestone milestone : milestones) {
            Integer slaDays = milestone.getMilestoneSlaDays();
            milestone.setPlannedStartAt(cursor);

            LocalDateTime plannedDue;
            if (slaDays == null || slaDays <= 0) {
                log.warn("Milestone missing SLA days when calculating planned baseline: contractId={}, milestoneId={}",
                    contractId, milestone.getMilestoneId());
                plannedDue = cursor;
            } else {
                plannedDue = cursor.plusDays(slaDays);
            }
            milestone.setPlannedDueDate(plannedDue);
            
            // Unlock milestone đầu tiên nếu được yêu cầu
            if (unlockFirstMilestone && milestone.getOrderIndex() != null && milestone.getOrderIndex() == 1) {
                if (milestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
                    milestone.setWorkStatus(MilestoneWorkStatus.READY_TO_START);
                    log.info("Milestone 1 unlocked and READY_TO_START: contractId={}, milestoneId={}",
                        contractId, milestone.getMilestoneId());
                }
            }
            
            cursor = plannedDue;
        }

        contractMilestoneRepository.saveAll(milestones);
        log.info("Calculated planned baseline dates for all milestones: contractId={}, milestoneCount={}, unlockFirst={}",
            contractId, milestones.size(), unlockFirstMilestone);
    }

    private void unlockMilestoneForStart(String contractId, int orderIndex) {
        Optional<ContractMilestone> milestoneOpt = contractMilestoneRepository
            .findByContractIdAndOrderIndex(contractId, orderIndex);

        if (milestoneOpt.isEmpty()) {
            log.warn("Cannot unlock milestone: contractId={}, orderIndex={}", contractId, orderIndex);
            return;
        }

        ContractMilestone milestone = milestoneOpt.get();
        if (milestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
            milestone.setWorkStatus(MilestoneWorkStatus.READY_TO_START);
            contractMilestoneRepository.save(milestone);
            log.info("Milestone unlocked and READY_TO_START: contractId={}, milestoneId={}, orderIndex={}",
                contractId, milestone.getMilestoneId(), orderIndex);
        }

        taskAssignmentService.activateAssignmentsForMilestone(contractId, milestone.getMilestoneId());
    }
    
    /**
     * Map ContractInstallment entity sang ContractInstallmentResponse
     */
    private ContractInstallmentResponse mapToInstallmentResponse(ContractInstallment installment) {
        return ContractInstallmentResponse.builder()
            .installmentId(installment.getInstallmentId())
            .contractId(installment.getContractId())
            .type(installment.getType())
            .milestoneId(installment.getMilestoneId())
            .label(installment.getLabel())
            .percent(installment.getPercent())
            .dueDate(installment.getDueDate())
            .amount(installment.getAmount())
            .currency(installment.getCurrency())
            .status(installment.getStatus())
            .gateCondition(installment.getGateCondition())
            .paidAt(installment.getPaidAt())
            .createdAt(installment.getCreatedAt())
            .updatedAt(installment.getUpdatedAt())
            .build();
    }
    
    /**
     * Mở installment DUE cho milestone khi milestone work status = READY_FOR_PAYMENT hoặc COMPLETED
     * (theo GateCondition.AFTER_MILESTONE_DONE)
     * 
     * Logic: 
     * - Mở installment DUE cho milestone hiện tại khi milestone đó READY_FOR_PAYMENT/COMPLETED
     * - Nếu milestone COMPLETED → auto mở installment DUE cho milestone tiếp theo (N+1)
     * 
     * @param milestoneId ID của milestone
     */
    public void openInstallmentForMilestoneIfReady(String milestoneId) {
        ContractMilestone milestone = contractMilestoneRepository.findById(milestoneId)
            .orElse(null);
        
        if (milestone == null) {
            log.warn("Milestone not found: milestoneId={}", milestoneId);
            return;
        }
        
        // Chỉ mở installment nếu milestone work status = READY_FOR_PAYMENT hoặc COMPLETED
        if (milestone.getWorkStatus() != MilestoneWorkStatus.READY_FOR_PAYMENT 
            && milestone.getWorkStatus() != MilestoneWorkStatus.COMPLETED) {
            return;
        }
        
        // Mở installment DUE cho milestone hiện tại (nếu status = PENDING)
        openInstallmentForMilestone(milestone.getContractId(), milestoneId);
        
        // Nếu milestone COMPLETED → auto mở installment DUE cho milestone tiếp theo (N+1)
        if (milestone.getWorkStatus() == MilestoneWorkStatus.COMPLETED) {
            Optional<ContractMilestone> nextMilestoneOpt = contractMilestoneRepository
                .findByContractIdAndOrderIndex(milestone.getContractId(), milestone.getOrderIndex() + 1);
            
            if (nextMilestoneOpt.isPresent()) {
                ContractMilestone nextMilestone = nextMilestoneOpt.get();
                openInstallmentForMilestone(milestone.getContractId(), nextMilestone.getMilestoneId());
            }
        }
    }
    
    /**
     * Mở installment DUE cho một milestone cụ thể (nếu status = PENDING và gateCondition = AFTER_MILESTONE_DONE)
     * 
     * @param contractId ID của contract
     * @param milestoneId ID của milestone cần mở installment
     */
    private void openInstallmentForMilestone(String contractId, String milestoneId) {
        Optional<ContractInstallment> installmentOpt = contractInstallmentRepository
            .findByContractIdAndMilestoneId(contractId, milestoneId);
        
        if (installmentOpt.isPresent()) {
            ContractInstallment installment = installmentOpt.get();
            
            // Chỉ mở nếu installment có gateCondition = AFTER_MILESTONE_DONE và status = PENDING
            if (installment.getGateCondition() == GateCondition.AFTER_MILESTONE_DONE 
                && installment.getStatus() == InstallmentStatus.PENDING) {
                installment.setStatus(InstallmentStatus.DUE);
                contractInstallmentRepository.save(installment);
                log.info("✅ Auto-opened milestone installment for payment: contractId={}, milestoneId={}, installmentId={}", 
                    contractId, milestoneId, installment.getInstallmentId());
            }
        }
    }
    
    /**
     * Helper method để gửi system message vào chat room
     */
    private void sendSystemMessageToChat(String requestId, String message) {
        try {
            // 1. Tìm chat room theo requestId
            ApiResponse<ChatRoomResponse> roomResponse = 
                chatServiceFeignClient.getChatRoomByRequestId("REQUEST_CHAT", requestId);
            
            if (roomResponse != null && "success".equals(roomResponse.getStatus()) 
                && roomResponse.getData() != null) {
                ChatRoomResponse roomData = roomResponse.getData();
                String roomId = roomData.getRoomId();
                
                if (roomId != null && !roomId.isBlank()) {
                    // 2. Gửi system message vào chat room
                    SendSystemMessageRequest messageRequest = SendSystemMessageRequest.builder()
                        .roomId(roomId)
                        .messageType("SYSTEM")
                        .content(message)
                        .build();
                    
                    chatServiceFeignClient.sendSystemMessage(messageRequest);
                    log.info("Sent system message to chat room: roomId={}, requestId={}", 
                        roomId, requestId);
                } else {
                    log.warn("Chat room found but roomId is null: requestId={}", requestId);
                }
            } else {
                log.warn("Chat room not found for request: requestId={}", requestId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to send system message to chat room: requestId={}, error={}", 
                requestId, e.getMessage(), e);
        }
    }
    
    /**
     * Lấy current user ID từ JWT token
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            log.error("userId claim not found in JWT - this should not happen!");
            throw UserNotAuthenticatedException.create();
        }
        throw UserNotAuthenticatedException.create();
    }
    
    /**
     * Map ServiceType sang ContractType
     */
    private ContractType mapServiceTypeToContractType(String serviceType) {
        if (serviceType == null) {
            return ContractType.transcription;
        }
        
        return switch (serviceType.toLowerCase()) {
            case "transcription" -> ContractType.transcription;
            case "arrangement" -> ContractType.arrangement;
            case "arrangement_with_recording" -> ContractType.arrangement_with_recording;
            case "recording" -> ContractType.recording;
            default -> ContractType.transcription;
        };
    }
    
    /**
     * Generate contract number: CTR-YYYYMMDD-XXXX
     */
    private String generateContractNumber(ContractType contractType) {
        String prefix = "CTR";
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String random = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return String.format("%s-%s-%s", prefix, date, random);
    }
    
    /**
     * Get default SLA days based on contract type
     */
    private Integer getDefaultSlaDays(ContractType contractType) {
        return switch (contractType) {
            case transcription -> 7;
            case arrangement -> 14;
            case arrangement_with_recording -> 21;  // Arrangement + Recording takes longer
            case recording -> 7;
            case bundle -> 21;  // Full package (T+A+R)
        };
    }
    
    /**
     * Lấy danh sách roles của user hiện tại từ JWT
     * Identity-service set: .claim("scope", usersAuth.getRole())
     * Role là enum: CUSTOMER, MANAGER, SYSTEM_ADMIN, TRANSCRIPTION, ARRANGEMENT, RECORDING_ARTIST
     * Mỗi user chỉ có 1 role duy nhất
     */
    @SuppressWarnings("unchecked")
    private List<String> getCurrentUserRoles() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            Object scopeObject = jwt.getClaim("scope");
            if (scopeObject instanceof String scopeString) {
                // Single role: "CUSTOMER", "MANAGER", etc.
                return List.of(scopeString);
            } else if (scopeObject instanceof List) {
                return (List<String>) scopeObject;
            }
            log.warn("scope claim not found in JWT");
            return List.of();
        }
        throw UserNotAuthenticatedException.create();
    }

    /**
     * Get contract signature image as base64 data URL (to export contract PDF)
     * @param contractId ID của contract
     * @return Base64 data URL của signature image
     * @throws SignatureImageNotFoundException nếu signature image không tồn tại
     * @throws SignatureRetrieveException nếu có lỗi khi download từ S3
     * @throws UnauthorizedException nếu user không có quyền truy cập contract signature
     */
    public String getSignatureImageBase64(String contractId) {
        // Lấy contract entity để check authorization
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Kiểm tra quyền truy cập signature
        checkSignatureAccess(contract);
        
        if (contract.getBSignatureS3Url() == null || contract.getBSignatureS3Url().isEmpty()) {
            throw SignatureImageNotFoundException.forContract(contractId);
        }
        
        try {
            // Download image from S3
            byte[] imageBytes = s3Service.downloadFileFromUrl(contract.getBSignatureS3Url());
            
            // Convert to base64 data URL
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            return "data:image/png;base64," + base64Image;
        } catch (Exception e) {
            log.error("Error downloading signature image from S3 for contract {}: {}", contractId, e.getMessage(), e);
            throw SignatureRetrieveException.failed(contractId, e.getMessage(), e);
        }
    }
    
    /**
     * Kiểm tra quyền truy cập contract
     * - SYSTEM_ADMIN: full access
     * - MANAGER: chỉ contracts họ quản lý
     * - CUSTOMER: chỉ contracts của họ
     * - SPECIALIST: không được xem contracts
     * @param contract Contract entity
     * @throws UnauthorizedException nếu user không có quyền
     */
    private void checkContractAccess(Contract contract) {
        String currentUserId = getCurrentUserId();
        List<String> userRoles = getCurrentUserRoles();
        
        // SYSTEM_ADMIN có full quyền
        if (hasRole(userRoles, "SYSTEM_ADMIN")) {
            log.debug("User {} (SYSTEM_ADMIN) granted access to contract {}", 
                currentUserId, contract.getContractId());
            return;
        }
        
        // MANAGER: chỉ contracts họ quản lý
        if (hasRole(userRoles, "MANAGER")) {
            if (contract.getManagerUserId() != null && contract.getManagerUserId().equals(currentUserId)) {
                log.debug("Manager {} granted access to contract {}", 
                    currentUserId, contract.getContractId());
                return;
            } else {
                log.warn("Manager {} tried to access contract {} (not managed by them)", 
                    currentUserId, contract.getContractId());
                throw UnauthorizedException.create(
                    "You can only access contracts that you manage");
            }
        }
        
        // CUSTOMER: chỉ contracts của họ
        if (hasRole(userRoles, "CUSTOMER")) {
            if (contract.getUserId() != null && contract.getUserId().equals(currentUserId)) {
                log.debug("Customer {} granted access to contract {}", 
                    currentUserId, contract.getContractId());
                return;
            } else {
                log.warn("Customer {} tried to access contract {} (not their contract)", 
                    currentUserId, contract.getContractId());
                throw UnauthorizedException.create(
                    "You can only access your own contracts");
            }
        }
        
        // SPECIALIST: không được xem contracts
        if (isSpecialist(userRoles)) {
            log.warn("Specialist {} tried to access contract {}", 
                currentUserId, contract.getContractId());
            throw UnauthorizedException.create(
                "Specialists cannot access contracts");
        }
        
        // Nếu không có role phù hợp, từ chối truy cập
        log.warn("User {} with roles {} tried to access contract {} (unauthorized)", 
            currentUserId, userRoles, contract.getContractId());
        throw UnauthorizedException.create(
            "You do not have permission to access this contract");
    }
    
    /**
     * Kiểm tra quyền truy cập signature của contract
     * - SYSTEM_ADMIN: full access
     * - MANAGER: chỉ contracts họ quản lý
     * - CUSTOMER: chỉ contracts của họ
     * - SPECIALIST: không được xem signature
     * @param contract Contract entity
     * @throws UnauthorizedException nếu user không có quyền
     */
    private void checkSignatureAccess(Contract contract) {
        String currentUserId = getCurrentUserId();
        List<String> userRoles = getCurrentUserRoles();
        
        // SYSTEM_ADMIN có full quyền
        if (hasRole(userRoles, "SYSTEM_ADMIN")) {
            log.debug("User {} (SYSTEM_ADMIN) granted access to signature of contract {}", 
                currentUserId, contract.getContractId());
            return;
        }
        
        // MANAGER: chỉ contracts họ quản lý
        if (hasRole(userRoles, "MANAGER")) {
            if (contract.getManagerUserId() != null && contract.getManagerUserId().equals(currentUserId)) {
                log.debug("Manager {} granted access to signature of contract {}", 
                    currentUserId, contract.getContractId());
                return;
            } else {
                log.warn("Manager {} tried to access signature of contract {} (not managed by them)", 
                    currentUserId, contract.getContractId());
                throw UnauthorizedException.create(
                    "You can only access signatures of contracts that you manage");
            }
        }
        
        // CUSTOMER: chỉ contracts của họ
        if (hasRole(userRoles, "CUSTOMER")) {
            if (contract.getUserId() != null && contract.getUserId().equals(currentUserId)) {
                log.debug("Customer {} granted access to signature of contract {}", 
                    currentUserId, contract.getContractId());
                return;
            } else {
                log.warn("Customer {} tried to access signature of contract {} (not their contract)", 
                    currentUserId, contract.getContractId());
                throw UnauthorizedException.create(
                    "You can only access signatures of your own contracts");
            }
        }
        
        // SPECIALIST: không được xem signature
        if (isSpecialist(userRoles)) {
            log.warn("Specialist {} tried to access signature of contract {}", 
                currentUserId, contract.getContractId());
            throw UnauthorizedException.create(
                "Specialists cannot access contract signatures");
        }
        
        // Nếu không có role phù hợp, từ chối truy cập
        log.warn("User {} with roles {} tried to access signature of contract {} (unauthorized)", 
            currentUserId, userRoles, contract.getContractId());
        throw UnauthorizedException.create(
            "You do not have permission to access this contract signature");
    }
    
    /**
     * Kiểm tra xem user có role hay không (case-insensitive)
     */
    private boolean hasRole(List<String> userRoles, String role) {
        return userRoles.stream()
                .anyMatch(r -> r.equalsIgnoreCase(role));
    }
    
    /**
     * Kiểm tra xem user có phải là specialist không
     * Specialist roles: TRANSCRIPTION, ARRANGEMENT, RECORDING_ARTIST
     */
    private boolean isSpecialist(List<String> userRoles) {
        return hasRole(userRoles, "TRANSCRIPTION")
            || hasRole(userRoles, "ARRANGEMENT")
            || hasRole(userRoles, "RECORDING_ARTIST");
    }

    /**
     * Upload contract PDF file and link with contract
     * @param contractId ID của contract
     * @param pdfInputStream PDF file input stream
     * @param fileName PDF file name
     * @param fileSize PDF file size in bytes
     * @return File ID của PDF đã upload
     */
    @Transactional
    public String uploadContractPdf(String contractId, InputStream pdfInputStream, String fileName, long fileSize) {
        // Get contract to verify it exists and is signed
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));

        // Cho phép upload PDF cho contract đã signed hoặc active
        if (contract.getStatus() != ContractStatus.signed && 
            contract.getStatus() != ContractStatus.active &&
            contract.getStatus() != ContractStatus.active_pending_assignment) {
            throw InvalidContractStatusException.cannotUploadPdf(contractId, contract.getStatus());
        }

        String currentUserId = getCurrentUserId();

        try {
            // Upload PDF to S3
            String s3Url = s3Service.uploadFile(
                    pdfInputStream,
                    fileName,
                    "application/pdf",
                    fileSize,
                    "contracts/pdfs",
                    false  // Private file
            );

            // Create File record
            File pdfFile = File.builder()
                    .fileName(fileName)
                    .filePath(s3Url)
                    .fileSize(fileSize)
                    .mimeType("application/pdf")
                    .fileSource(FileSourceType.contract_pdf)  // Or create new type for contract_pdf
                    .contentType(ContentType.contract_pdf)
                    .description("Signed contract PDF for contract: " + contract.getContractNumber())
                    .createdBy(currentUserId)
                    .requestId(contract.getRequestId())
                    .fileStatus(FileStatus.uploaded)
                    .deliveredToCustomer(true)  // Contract PDF is delivered to customer
                    .deliveredAt(Instant.now())
                    .deliveredBy(currentUserId)
                    .build();

            File savedFile = fileRepository.save(pdfFile);

            // Link PDF with contract
            contract.setFileId(savedFile.getFileId());
            contractRepository.save(contract);

            log.info("Contract PDF uploaded successfully: contractId={}, fileId={}, s3Url={}", 
                    contractId, savedFile.getFileId(), s3Url);

            return savedFile.getFileId();
        } catch (Exception e) {
            log.error("Error uploading contract PDF for contract {}: {}", contractId, e.getMessage(), e);
            throw ContractPdfUploadException.failed(contractId, e.getMessage(), e);
        }
    }
}

