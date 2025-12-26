package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.request.CreateMilestoneRequest;
import com.mutrapro.shared.event.ContractNotificationEvent;
import com.mutrapro.project_service.dto.response.ContractInstallmentResponse;
import com.mutrapro.project_service.dto.response.ContractMilestoneResponse;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.dto.response.MilestonePaymentQuoteResponse;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.dto.response.RequestContractInfo;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.config.LateDiscountPolicyProperties;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractInstallment;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import com.mutrapro.project_service.enums.GateCondition;
import com.mutrapro.project_service.enums.InstallmentStatus;
import com.mutrapro.project_service.enums.InstallmentType;
import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.MilestoneType;
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
import com.mutrapro.shared.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractSignSessionRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.ContentType;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.event.MilestonePaidNotificationEvent;
import com.mutrapro.shared.event.MilestoneReadyForPaymentNotificationEvent;
import com.mutrapro.shared.event.ChatSystemMessageEvent;
import com.mutrapro.shared.event.MilestonePaidEvent;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.entity.StudioBooking;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.LocalTime;

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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Comparator;
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
    LateDiscountPolicyProperties lateDiscountPolicyProperties;
    ContractMapper contractMapper;
    ContractMilestoneMapper contractMilestoneMapper;
    RequestServiceFeignClient requestServiceFeignClient;
    ContractSignSessionRepository contractSignSessionRepository;
    FileRepository fileRepository;
    MilestoneProgressService milestoneProgressService;
    ContractMilestoneService contractMilestoneService;
    TaskAssignmentService taskAssignmentService;
    StudioBookingService studioBookingService;
    com.mutrapro.project_service.repository.StudioBookingRepository studioBookingRepository;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;
    com.mutrapro.project_service.repository.TaskAssignmentRepository taskAssignmentRepository;
    
    @Autowired(required = false)
    S3Service s3Service;

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
        // Cho phép tạo contract mới khi contract cũ đã bị cancel/reject/need_revision/expired
        // need_revision không phải active, manager cần tạo contract mới dựa trên revision request
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
                        || status == ContractStatus.active_pending_assignment
                        || status == ContractStatus.completed;  // Không cho phép tạo mới khi đã hoàn thành
                });
            
            if (hasActiveContract) {
                throw ContractAlreadyExistsException.forRequest(requestId);
            }
            // Cho phép tạo mới khi contract đã bị cancel/reject/need_revision/expired
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
        LocalDateTime expectedStartDate = null;
        
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
            // Validate: recording contract phải có đúng 1 milestone
            if (contractType == ContractType.recording && createRequest.getMilestones().size() != 1) {
                throw new IllegalArgumentException(
                    String.format("Recording contract must have exactly 1 milestone. Got: %d milestones", 
                        createRequest.getMilestones().size()));
            }
            
            // Validate: recording milestone phải có milestoneType = recording
            if (contractType == ContractType.recording) {
                CreateMilestoneRequest milestone = createRequest.getMilestones().get(0);
                if (milestone.getMilestoneType() != MilestoneType.recording) {
                    throw new IllegalArgumentException(
                        String.format("Recording contract milestone must have type 'recording'. Got: %s", 
                            milestone.getMilestoneType()));
                }
            }
            
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
        
        // Update milestones nếu có trong request
        if (updateRequest.getMilestones() != null && !updateRequest.getMilestones().isEmpty()) {
            // Validate: recording contract phải có đúng 1 milestone
            if (saved.getContractType() == ContractType.recording && updateRequest.getMilestones().size() != 1) {
                throw new IllegalArgumentException(
                    String.format("Recording contract must have exactly 1 milestone. Got: %d milestones", 
                        updateRequest.getMilestones().size()));
            }
            
            // Validate: recording milestone phải có milestoneType = recording
            if (saved.getContractType() == ContractType.recording) {
                CreateMilestoneRequest milestone = updateRequest.getMilestones().get(0);
                if (milestone.getMilestoneType() != MilestoneType.recording) {
                    throw new IllegalArgumentException(
                        String.format("Recording contract milestone must have type 'recording'. Got: %s", 
                            milestone.getMilestoneType()));
                }
            }
            
            // Validate: depositPercent + sum(paymentPercent của milestones có hasPayment=true) = 100%
            BigDecimal depositPercent = saved.getDepositPercent() != null 
                ? saved.getDepositPercent() 
                : BigDecimal.valueOf(40.0);
            validatePaymentPercentages(depositPercent, updateRequest.getMilestones());
            
            // Validate: sum(milestoneSlaDays) = contract slaDays
            Integer slaDays = saved.getSlaDays() != null 
                ? saved.getSlaDays() 
                : getDefaultSlaDays(saved.getContractType());
            validateMilestoneSlaDays(slaDays, updateRequest.getMilestones());
            
            // Xóa milestones cũ và installments liên quan
            List<ContractMilestone> existingMilestones = contractMilestoneRepository
                .findByContractIdOrderByOrderIndexAsc(contractId);
            for (ContractMilestone milestone : existingMilestones) {
                // Xóa installment của milestone này (nếu có)
                contractInstallmentRepository
                    .findByContractIdAndMilestoneId(contractId, milestone.getMilestoneId())
                    .ifPresent(installment -> {
                        // Chỉ xóa installment không phải DEPOSIT
                        if (installment.getType() != InstallmentType.DEPOSIT) {
                            contractInstallmentRepository.delete(installment);
                            log.info("Deleted milestone installment: installmentId={}, milestoneId={}", 
                                installment.getInstallmentId(), milestone.getMilestoneId());
                        }
                    });
                // Xóa milestone
                contractMilestoneRepository.delete(milestone);
                log.info("Deleted milestone: milestoneId={}, contractId={}", 
                    milestone.getMilestoneId(), contractId);
            }
            
            // Tạo milestones mới
            List<ContractMilestone> createdMilestones = createMilestonesFromRequest(saved, updateRequest.getMilestones());
            
            // Tạo installments mới cho milestones
            createInstallmentsForContract(saved, depositPercent, updateRequest.getMilestones(), createdMilestones);
            
            log.info("Updated milestones for contract: contractId={}, milestonesCount={}", 
                contractId, createdMilestones.size());
        }
        
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
        LocalDateTime now = LocalDateTime.now();
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
                    
                    // Release slots cho booking (nếu có)
                    try {
                        studioBookingService.releaseSlotsForBooking(contract.getContractId(), "CONTRACT_EXPIRED");
                        log.info("Released slots for booking: contractId={}", contract.getContractId());
                    } catch (Exception e) {
                        log.error("Failed to release slots for booking: contractId={}, error={}", 
                            contract.getContractId(), e.getMessage(), e);
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
        LocalDateTime cutoff = LocalDateTime.now();
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
        
        // Pass contract to avoid reloading it in enrich method
        return enrichWithMilestonesAndInstallments(response, contract);
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
        
        ContractMilestoneResponse response = contractMilestoneMapper.toResponse(milestone);

        // Populate target deadline (hard/target) for FE
        try {
            List<ContractMilestone> allMilestones = contractMilestoneRepository
                .findByContractIdOrderByOrderIndexAsc(contractId);
            LocalDateTime targetDeadline = resolveMilestoneTargetDeadline(milestone, contract, allMilestones);
            response.setTargetDeadline(targetDeadline);

            // Estimated deadline chỉ khi chưa có target/planned
            LocalDateTime plannedDeadline = resolveMilestonePlannedDeadline(milestone);
            if (targetDeadline == null && plannedDeadline == null) {
                response.setEstimatedDeadline(calculateEstimatedDeadlineForMilestone(milestone, contract, allMilestones));
            }

            // Computed SLA status (first submission vs target deadline)
            if (targetDeadline != null) {
                LocalDateTime firstSubmissionAt = milestone.getFirstSubmissionAt();
                if (firstSubmissionAt != null) {
                    response.setFirstSubmissionLate(firstSubmissionAt.isAfter(targetDeadline));
                    response.setOverdueNow(false);
                } else {
                    response.setFirstSubmissionLate(null);
                    response.setOverdueNow(LocalDateTime.now().isAfter(targetDeadline));
                }
            } else {
                response.setFirstSubmissionLate(null);
                response.setOverdueNow(null);
            }
        } catch (Exception e) {
            log.warn("Failed to calculate targetDeadline for milestone: contractId={}, milestoneId={}, error={}",
                contractId, milestoneId, e.getMessage());
        }
        
        // Enrich với arrangement submission nếu là recording milestone
        if (milestone.getMilestoneType() == MilestoneType.recording) {
            try {
                TaskAssignmentResponse.ArrangementSubmissionInfo arrangementSubmissionInfo = 
                    contractMilestoneService.enrichMilestoneWithArrangementSubmission(milestone);
                
                if (arrangementSubmissionInfo != null) {
                    // Map từ TaskAssignmentResponse.ArrangementSubmissionInfo sang ContractMilestoneResponse.ArrangementSubmissionInfo
                    ContractMilestoneResponse.ArrangementSubmissionInfo mappedInfo = 
                        ContractMilestoneResponse.ArrangementSubmissionInfo.builder()
                            .submissionId(arrangementSubmissionInfo.getSubmissionId())
                            .submissionName(arrangementSubmissionInfo.getSubmissionName())
                            .status(arrangementSubmissionInfo.getStatus())
                            .version(arrangementSubmissionInfo.getVersion())
                            .files(arrangementSubmissionInfo.getFiles() != null 
                                ? arrangementSubmissionInfo.getFiles().stream()
                                    .map(f -> ContractMilestoneResponse.FileInfo.builder()
                                        .fileId(f.getFileId())
                                        .fileName(f.getFileName())
                                        .fileUrl(f.getFileUrl())
                                        .fileSize(f.getFileSize())
                                        .mimeType(f.getMimeType())
                                        .build())
                                    .collect(Collectors.toList())
                                : null)
                            .build();
                    response.setSourceArrangementSubmission(mappedInfo);
                }
            } catch (Exception e) {
                log.warn("Failed to enrich milestone with arrangement submission: milestoneId={}, error={}", 
                    milestoneId, e.getMessage());
            }
        }
        
        return response;
    }

    /**
     * Quote the payable amount for a milestone installment, including late discount breakdown (if applicable).
     * Used by FE to show breakdown at Pay, and by billing-service to charge the correct amount.
     */
    @Transactional(readOnly = true)
    public MilestonePaymentQuoteResponse getMilestonePaymentQuote(String contractId, String milestoneId) {
        // Quick check: if SYSTEM_ADMIN, skip access check to save time
        List<String> userRoles = getCurrentUserRoles();
        boolean isSystemAdmin = hasRole(userRoles, "SYSTEM_ADMIN");
        
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Skip access check for SYSTEM_ADMIN (internal service calls)
        if (!isSystemAdmin) {
            checkContractAccess(contract);
        }

        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(milestoneId, contractId));

        ContractInstallment installment = contractInstallmentRepository
            .findByContractIdAndMilestoneId(contractId, milestoneId)
            .orElseThrow(() -> ContractInstallmentNotFoundException.forMilestone(milestoneId, contractId));

        // Only load all milestones if needed for targetDeadline calculation (workflow 3)
        List<ContractMilestone> allMilestones = null;
        if (contract.getContractType() == ContractType.arrangement_with_recording 
            && milestone.getMilestoneType() == MilestoneType.recording) {
            allMilestones = contractMilestoneRepository
                .findByContractIdOrderByOrderIndexAsc(contractId);
        }

        return buildMilestonePaymentQuote(contract, milestone, installment, allMilestones);
    }
    
    
    /**
     * Enrich ContractResponse với milestones và installments
     */
    private ContractResponse enrichWithMilestonesAndInstallments(ContractResponse response) {
        return enrichWithMilestonesAndInstallments(response, null);
    }
    
    private ContractResponse enrichWithMilestonesAndInstallments(ContractResponse response, Contract contract) {
        if (response == null || response.getContractId() == null) {
            return response;
        }
        
        String contractId = response.getContractId();
        
        // Load milestones
        List<ContractMilestone> milestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        
        // Use provided contract if available, otherwise load only if needed for deadline calculations
        Contract contractToUse = contract;
        if (contractToUse == null) {
            boolean needsContractForDeadlines = milestones.stream()
                .anyMatch(m -> m.getPlannedDueDate() == null && m.getMilestoneSlaDays() != null);
            
            if (needsContractForDeadlines) {
                try {
                            contractToUse = contractRepository.findById(contractId).orElse(null);
                } catch (Exception e) {
                    log.warn("Failed to fetch contract when enriching milestones: contractId={}, error={}",
                                contractId, e.getMessage());
                }
            }
        }
        final Contract finalContract = contractToUse;
        List<ContractMilestoneResponse> milestoneResponses = milestones.stream()
            .map(m -> {
                ContractMilestoneResponse r = contractMilestoneMapper.toResponse(m);
                try {
                    LocalDateTime targetDeadline = resolveMilestoneTargetDeadline(m, finalContract, milestones);
                    r.setTargetDeadline(targetDeadline);

                    // Estimated deadline chỉ khi chưa có target/planned
                    LocalDateTime plannedDeadline = resolveMilestonePlannedDeadline(m);
                    if (targetDeadline == null && plannedDeadline == null) {
                        r.setEstimatedDeadline(calculateEstimatedDeadlineForMilestone(m, finalContract, milestones));
                    }

                    // Computed SLA status (first submission vs target deadline)
                    if (targetDeadline != null) {
                        LocalDateTime firstSubmissionAt = m.getFirstSubmissionAt();
                        if (firstSubmissionAt != null) {
                            r.setFirstSubmissionLate(firstSubmissionAt.isAfter(targetDeadline));
                            r.setOverdueNow(false);
                        } else {
                            r.setFirstSubmissionLate(null);
                            r.setOverdueNow(LocalDateTime.now().isAfter(targetDeadline));
                        }
                    } else {
                        r.setFirstSubmissionLate(null);
                        r.setOverdueNow(null);
                    }
                } catch (Exception ignored) {
                    // keep response without targetDeadline
                }
                return r;
            })
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
     * Target deadline (deadline mục tiêu / hard deadline) cho milestone.
     *
     * QUAN TRỌNG:
     * - Không trả về actualEndAt (vì đó là mốc hoàn thành/thanh toán, không phải deadline mục tiêu).
     * - Recording milestone:
     *   - arrangement_with_recording: hard deadline = last arrangement actualEndAt (paid) + SLA days (booking không dời deadline)
     *   - recording-only: deadline = bookingDate(+startTime) + SLA days
     */
    private LocalDateTime resolveMilestonePlannedDeadline(ContractMilestone milestone) {
        if (milestone == null) {
            return null;
        }
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (milestone.getPlannedDueDate() != null) {
            return milestone.getPlannedDueDate();
        }
        if (slaDays != null && slaDays > 0 && milestone.getPlannedStartAt() != null) {
            return milestone.getPlannedStartAt().plusDays(slaDays);
        }
        return null;
    }

    /**
     * Target deadline (deadline mục tiêu / hard deadline) cho milestone.
     * - Có thể truyền allContractMilestones để tránh query lặp (đặc biệt workflow 3).
     */
    private LocalDateTime resolveMilestoneTargetDeadline(
        ContractMilestone milestone,
        Contract contract,
        List<ContractMilestone> allContractMilestones
    ) {
        if (milestone == null) {
            return null;
        }
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (slaDays == null || slaDays <= 0) {
            return null;
        }

        // Recording milestone: special rules
        if (milestone.getMilestoneType() == MilestoneType.recording) {
            if (contract != null && contract.getContractType() == ContractType.arrangement_with_recording) {
                // Workflow 3: hard deadline = last arrangement actualEndAt (paid) + SLA (ignore booking)
                List<ContractMilestone> all = allContractMilestones != null
                    ? allContractMilestones
                    : contractMilestoneRepository.findByContractIdOrderByOrderIndexAsc(milestone.getContractId());
                ContractMilestone lastArrangement = all.stream()
                    .filter(m -> m.getMilestoneType() == MilestoneType.arrangement)
                    .max(Comparator.comparing(ContractMilestone::getOrderIndex))
                    .orElse(null);
                if (lastArrangement != null && lastArrangement.getActualEndAt() != null) {
                    return lastArrangement.getActualEndAt().plusDays(slaDays);
                }
                // If arrangement not paid yet => fallback planned
            } else if (contract != null && contract.getContractType() == ContractType.recording) {
                // Workflow 4: booking date (+ startTime) + SLA
                Optional<StudioBooking> bookingOpt = studioBookingRepository.findByMilestoneId(milestone.getMilestoneId());
                if (bookingOpt.isPresent()) {
                    StudioBooking booking = bookingOpt.get();
                    List<BookingStatus> activeStatuses = List.of(
                        BookingStatus.TENTATIVE, BookingStatus.PENDING,
                        BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
                    if (activeStatuses.contains(booking.getStatus()) && booking.getBookingDate() != null) {
                        LocalTime startTime = booking.getStartTime() != null ? booking.getStartTime() : LocalTime.of(8, 0);
                        LocalDateTime startAt = booking.getBookingDate().atTime(startTime);
                        return startAt.plusDays(slaDays);
                    }
                }
            }

            // Fallback for recording: planned dates
            if (milestone.getPlannedDueDate() != null) {
                return milestone.getPlannedDueDate();
            }
            if (milestone.getPlannedStartAt() != null) {
                return milestone.getPlannedStartAt().plusDays(slaDays);
            }
            return null;
        }

        // Other milestones: target deadline is based on actualStartAt (once started), otherwise planned
        if (milestone.getActualStartAt() != null) {
            return milestone.getActualStartAt().plusDays(slaDays);
        }
        if (milestone.getPlannedDueDate() != null) {
            return milestone.getPlannedDueDate();
        }
        if (milestone.getPlannedStartAt() != null) {
            return milestone.getPlannedStartAt().plusDays(slaDays);
        }
        return null;
    }

    private LocalDateTime calculateEstimatedPlannedStartAtForMilestone(
        ContractMilestone milestone,
        Contract contract,
        List<ContractMilestone> allMilestones
    ) {
        if (milestone == null) {
            return null;
        }
        Integer orderIndex = milestone.getOrderIndex();
        if (orderIndex == null || orderIndex <= 1) {
            return LocalDateTime.now();
        }
        if (allMilestones == null || allMilestones.isEmpty()) {
            return LocalDateTime.now();
        }
        ContractMilestone previous = allMilestones.stream()
            .filter(m -> m.getOrderIndex() != null && m.getOrderIndex() == orderIndex - 1)
            .findFirst()
            .orElse(null);
        if (previous == null) {
            return LocalDateTime.now();
        }
        LocalDateTime prevEstimatedDeadline = calculateEstimatedDeadlineForMilestone(previous, contract, allMilestones);
        if (prevEstimatedDeadline != null) {
            return prevEstimatedDeadline;
        }
        LocalDateTime prevEstimatedStart = calculateEstimatedPlannedStartAtForMilestone(previous, contract, allMilestones);
        Integer prevSla = previous.getMilestoneSlaDays();
        if (prevEstimatedStart != null && prevSla != null && prevSla > 0) {
            return prevEstimatedStart.plusDays(prevSla);
        }
        return LocalDateTime.now();
    }

    private LocalDateTime calculateEstimatedDeadlineForMilestone(
        ContractMilestone milestone,
        Contract contract,
        List<ContractMilestone> allMilestones
    ) {
        if (milestone == null) {
            return null;
        }
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (slaDays == null || slaDays <= 0) {
            return null;
        }

        // Ưu tiên: nếu đã resolve được targetDeadline (booking / arrangement-paid / planned / actualStartAt)
        LocalDateTime deadline = resolveMilestoneTargetDeadline(milestone, contract, allMilestones);
        if (deadline != null) {
            return deadline;
        }

        LocalDateTime estimatedStart = calculateEstimatedPlannedStartAtForMilestone(milestone, contract, allMilestones);
        return estimatedStart != null ? estimatedStart.plusDays(slaDays) : null;
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
        contract.setSentToCustomerAt(LocalDateTime.now());
        
        // Set expiresAt (mặc định 7 ngày nếu chưa có)
        if (expiresInDays != null && expiresInDays > 0) {
            contract.setExpiresAt(LocalDateTime.now().plusDays(expiresInDays));
            log.info("Set expiresAt for contract: contractId={}, expiresInDays={}", contractId, expiresInDays);
        } else if (contract.getExpiresAt() == null) {
            // Mặc định 7 ngày nếu không chỉ định và chưa có
            int defaultDays = 7;
            contract.setExpiresAt(LocalDateTime.now().plusDays(defaultDays));
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
        
        // Gửi notification cho customer qua Kafka
        try {
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                ? contract.getContractNumber()
                : contractId;
            
            ContractNotificationEvent event = ContractNotificationEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .userId(contract.getUserId())
                    .notificationType("CONTRACT_SENT")
                    .title("Contract mới đã được gửi")
                    .content(String.format("Contract #%s đã được gửi cho bạn. Vui lòng xem xét và phản hồi.", 
                            contractLabel))
                    .referenceType("CONTRACT")
                    .actionUrl("/contracts/" + contractId)
                    .timestamp(LocalDateTime.now())
                    .build();
            
            publishToOutbox(event, contractId, "Contract", "contract.notification");
            log.info("Queued ContractNotificationEvent in outbox: eventId={}, contractId={}, userId={}", 
                    event.getEventId(), contractId, contract.getUserId());
        } catch (Exception e) {
            log.error("Failed to enqueue notification: userId={}, contractId={}, error={}", 
                    contract.getUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room (TRƯỚC contract signed → REQUEST_CHAT)
        String systemMessage = String.format(
            "📄 Manager đã gửi contract #%s cho bạn. Vui lòng xem xét và phản hồi trong vòng %d ngày.",
            contract.getContractNumber(),
            expiresInDays != null ? expiresInDays : 7
        );
        publishChatSystemMessageEvent("REQUEST_CHAT", contract.getRequestId(), systemMessage);
        
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
     * SYSTEM_ADMIN: trả về tất cả contracts
     * MANAGER: chỉ trả về contracts họ quản lý
     * Sắp xếp theo ngày tạo mới nhất lên đầu
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> getMyManagedContracts() {
        List<String> userRoles = getCurrentUserRoles();
        boolean isSystemAdmin = hasRole(userRoles, "SYSTEM_ADMIN");
        
        List<Contract> contracts;
        if (isSystemAdmin) {
            // SYSTEM_ADMIN: xem tất cả contracts
            contracts = contractRepository.findAll();
            // Sort by createdAt descending
            contracts = contracts.stream()
                .sorted(Comparator.comparing(Contract::getCreatedAt).reversed())
                .collect(Collectors.toList());
        } else {
            // MANAGER: chỉ contracts họ quản lý
        String managerId = getCurrentUserId();
            contracts = contractRepository.findByManagerUserIdOrderByCreatedAtDesc(managerId);
        }
        
        return contracts.stream()
            .map(contractMapper::toResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy danh sách contracts được quản lý bởi manager hiện tại với filter và pagination
     * SYSTEM_ADMIN: trả về tất cả contracts (không filter theo manager)
     * MANAGER: chỉ trả về contracts họ quản lý
     * Sắp xếp theo ngày tạo mới nhất lên đầu
     */
    @Transactional(readOnly = true)
    public PageResponse<ContractResponse> getMyManagedContractsWithFilters(
            String search,
            ContractType contractType,
            ContractStatus status,
            CurrencyType currency,
            int page,
            int size) {
        List<String> userRoles = getCurrentUserRoles();
        boolean isSystemAdmin = hasRole(userRoles, "SYSTEM_ADMIN");
        
        // Build Pageable với sort by createdAt DESC
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        Page<Contract> contractsPage;
        if (isSystemAdmin) {
            // SYSTEM_ADMIN: xem tất cả contracts (không filter theo manager)
            contractsPage = contractRepository.findAllContractsWithFilters(
                    search, contractType, status, currency, pageable);
        } else {
            // MANAGER: chỉ contracts họ quản lý
            String managerId = getCurrentUserId();
            contractsPage = contractRepository.findMyManagedContractsWithFilters(
                managerId, search, contractType, status, currency, pageable);
        }
        
        // Map to response
        List<ContractResponse> responses = contractsPage.getContent().stream()
            .map(contractMapper::toResponse)
            .collect(Collectors.toList());
        
        // Build PageResponse
        return PageResponse.<ContractResponse>builder()
                .content(responses)
                .pageNumber(contractsPage.getNumber())
                .pageSize(contractsPage.getSize())
                .totalElements(contractsPage.getTotalElements())
                .totalPages(contractsPage.getTotalPages())
                .first(contractsPage.isFirst())
                .last(contractsPage.isLast())
                .hasNext(contractsPage.hasNext())
                .hasPrevious(contractsPage.hasPrevious())
                .build();
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
            
            // Contract được coi là "active" nếu đang trong quá trình hoặc đã completed
            // need_revision KHÔNG được coi là active (cho phép tạo contract mới)
            boolean hasActiveContract = contract != null && (
                contract.getStatus() == ContractStatus.draft 
                || contract.getStatus() == ContractStatus.sent 
                || contract.getStatus() == ContractStatus.approved 
                || contract.getStatus() == ContractStatus.signed
                || contract.getStatus() == ContractStatus.active
                || contract.getStatus() == ContractStatus.active_pending_assignment
                || contract.getStatus() == ContractStatus.completed  // Đã hoàn thành, không cho tạo mới
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
        if (contract.getExpiresAt() != null && contract.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw ContractExpiredException.cannotSign(contract.getContractId(), contract.getExpiresAt());
        }
        
        // Update status - CHỈ set APPROVED, chưa ký
        contract.setStatus(ContractStatus.approved);
        contract.setCustomerReviewedAt(LocalDateTime.now());
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
        
        // Gửi notification cho manager qua Kafka
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
                    .title("Contract đã được duyệt")
                    .content(String.format("Customer đã duyệt contract #%s. Vui lòng chờ customer ký để bắt đầu thực hiện.", 
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
        
        // Gửi system message vào chat room (TRƯỚC contract signed → REQUEST_CHAT)
        String systemMessage = String.format(
            "✅ Customer đã duyệt contract #%s. Đang chờ ký để bắt đầu thực hiện.",
            contract.getContractNumber()
        );
        publishChatSystemMessageEvent("REQUEST_CHAT", contract.getRequestId(), systemMessage);
        
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
        contract.setCustomerReviewedAt(LocalDateTime.now());
        
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
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                ? contract.getContractNumber()
                : contractId;
            
            ContractNotificationEvent event = ContractNotificationEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .userId(contract.getManagerUserId())
                    .notificationType("CONTRACT_NEED_REVISION")
                    .title("Customer yêu cầu chỉnh sửa Contract")
                    .content(String.format("Customer đã yêu cầu chỉnh sửa contract #%s. Lý do: %s", 
                            contractLabel, request.getReason()))
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts")
                    .reason(request.getReason())
                    .timestamp(LocalDateTime.now())
                    .build();
            
            publishToOutbox(event, contractId, "Contract", "contract.notification");
            log.info("Sent notification to manager: userId={}, contractId={}", 
                    contract.getManagerUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room (TRƯỚC contract signed → REQUEST_CHAT)
        String systemMessage = String.format(
            "✏️ Customer yêu cầu chỉnh sửa contract #%s.\nLý do: %s",
            contract.getContractNumber(),
            request.getReason()
        );
        publishChatSystemMessageEvent("REQUEST_CHAT", contract.getRequestId(), systemMessage);
        
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
        // Không cho phép hủy khi đã APPROVED, SIGNED, ACTIVE, COMPLETED hoặc đã bắt đầu thực hiện
        if (contract.getStatus() != ContractStatus.sent) {
            if (contract.getStatus() == ContractStatus.approved || 
                contract.getStatus() == ContractStatus.signed ||
                contract.getStatus() == ContractStatus.active ||
                contract.getStatus() == ContractStatus.active_pending_assignment ||
                contract.getStatus() == ContractStatus.completed) {
                throw InvalidContractStatusException.cannotCancel(
                    contractId, contract.getStatus(),
                    "Contract đã được approve, đã ký, đã active hoặc đã completed. Không thể hủy trực tiếp. Vui lòng liên hệ support để yêu cầu hủy hợp đồng.");
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
        contract.setCustomerReviewedAt(LocalDateTime.now());
        
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
        
        // Release slots cho booking (nếu có)
        try {
            studioBookingService.releaseSlotsForBooking(contractId, "CONTRACT_CANCELLED_BY_CUSTOMER");
            log.info("Released slots for booking: contractId={}", contractId);
        } catch (Exception e) {
            log.error("Failed to release slots for booking: contractId={}, error={}", 
                contractId, e.getMessage(), e);
        }
        
        // Gửi notification cho manager qua Kafka
        try {
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                ? contract.getContractNumber()
                : contractId;
            
            ContractNotificationEvent event = ContractNotificationEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .userId(contract.getManagerUserId())
                    .notificationType("CONTRACT_CANCELED_BY_CUSTOMER")
                    .title("Customer đã hủy Contract")
                    .content(String.format("Customer đã hủy contract #%s. Lý do: %s", 
                            contractLabel, request.getReason()))
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts")
                    .reason(request.getReason())
                    .timestamp(LocalDateTime.now())
                    .build();
            
            publishToOutbox(event, contractId, "Contract", "contract.notification");
            log.info("Queued ContractNotificationEvent in outbox: eventId={}, contractId={}, userId={}", 
                    event.getEventId(), contractId, contract.getManagerUserId());
        } catch (Exception e) {
            log.error("Failed to enqueue notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room (TRƯỚC contract signed → REQUEST_CHAT)
        String systemMessage = String.format(
            "❌ Customer đã hủy contract #%s.\nLý do: %s",
            contract.getContractNumber(),
            request.getReason()
        );
        publishChatSystemMessageEvent("REQUEST_CHAT", contract.getRequestId(), systemMessage);
        
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
        
        // Kiểm tra status: không cho phép hủy khi đã APPROVED, SIGNED, ACTIVE hoặc COMPLETED
        // Cho phép hủy khi DRAFT hoặc SENT
        if (contract.getStatus() == ContractStatus.approved || 
            contract.getStatus() == ContractStatus.signed ||
            contract.getStatus() == ContractStatus.active ||
            contract.getStatus() == ContractStatus.active_pending_assignment ||
            contract.getStatus() == ContractStatus.completed) {
            throw InvalidContractStatusException.cannotCancel(
                contractId, contract.getStatus(),
                "Contract đã được approve, đã ký, đã active hoặc đã completed. Không thể hủy. Vui lòng liên hệ support để xử lý.");
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
            // Gửi system message vào chat room (TRƯỚC contract signed → REQUEST_CHAT)
            String systemMessage = String.format(
                "🚫 Manager đã thu hồi contract #%s.\nLý do: %s",
                contract.getContractNumber(),
                request.getReason()
            );
            publishChatSystemMessageEvent("REQUEST_CHAT", contract.getRequestId(), systemMessage);
            
            // Gửi notification cho customer về việc manager hủy contract
            try {
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : contractId;
                
                ContractNotificationEvent event = ContractNotificationEvent.builder()
                        .eventId(UUID.randomUUID())
                        .contractId(contractId)
                        .contractNumber(contractLabel)
                        .userId(contract.getUserId())
                        .notificationType("CONTRACT_CANCELED_BY_MANAGER")
                        .title("Contract đã bị thu hồi")
                        .content(String.format("Manager đã thu hồi contract #%s. Lý do: %s", 
                                contractLabel, request.getReason()))
                        .referenceType("CONTRACT")
                        .actionUrl("/contracts/" + contractId)
                        .reason(request.getReason())
                        .timestamp(LocalDateTime.now())
                        .build();
                
                publishToOutbox(event, contractId, "Contract", "contract.notification");
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
    public void handleDepositPaid(String contractId, String installmentId, LocalDateTime paidAt) {
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
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                ? contract.getContractNumber()
                : contractId;
            String currency = contract.getCurrency() != null ? contract.getCurrency().toString() : "VND";
            
            ContractNotificationEvent event = ContractNotificationEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .userId(contract.getManagerUserId())
                    .notificationType("MILESTONE_PAID")
                    .title("Deposit đã được thanh toán")
                    .content(String.format("Customer đã thanh toán deposit cho contract #%s. Số tiền: %s %s", 
                            contractLabel,
                            depositInstallment.getAmount().toPlainString(),
                            currency))
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts/" + contractId)
                    .timestamp(LocalDateTime.now())
                    .build();
            
            publishToOutbox(event, contractId, "Contract", "contract.notification");
            log.info("Sent deposit paid notification to manager: userId={}, contractId={}", 
                    contract.getManagerUserId(), contractId);
        } catch (Exception e) {
            log.error("Failed to send deposit paid notification: userId={}, contractId={}, error={}", 
                    contract.getManagerUserId(), contractId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room (SAU contract signed → CONTRACT_CHAT)
        String systemMessage = String.format(
            "💰 Customer đã thanh toán deposit cho contract #%s.\nSố tiền: %s %s",
            contract.getContractNumber(),
            depositInstallment.getAmount().toPlainString(),
            contract.getCurrency() != null ? contract.getCurrency() : "VND"
        );
        publishChatSystemMessageEvent("CONTRACT_CHAT", contract.getContractId(), systemMessage);
        
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
            
            // Update booking status từ TENTATIVE → CONFIRMED (chỉ cho recording contracts)
            // Check contractType có recording milestone
            if (contract.getContractType() == ContractType.recording) {
                try {
                    studioBookingService.updateBookingStatusOnDepositPaid(contractId);
                } catch (Exception e) {
                    log.error("Failed to update booking status on deposit paid: contractId={}, error={}", 
                        contractId, e.getMessage(), e);
                    // Không throw exception để không fail transaction
                }
            }
        }
    }

    /**
     * Manager xác nhận đã assign xong và bắt đầu thực thi contract.
     */
    @Transactional
    public ContractResponse startContractWork(String contractId, LocalDateTime requestedStartAt) {
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

        // Chỉ milestone 1 phải có task assignment và đã được accept
        // Các milestone khác có thể chưa assign hoặc chưa accept (contract không bị block)
        List<ContractMilestone> allMilestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        
        if (allMilestones.isEmpty()) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId,
                contract.getStatus(),
                "Cannot start contract work: Contract must have at least one milestone."
            );
        }
        
        // Tìm milestone 1
        ContractMilestone firstMilestone = allMilestones.stream()
            .filter(m -> m.getOrderIndex() != null && m.getOrderIndex() == 1)
            .findFirst()
            .orElse(null);
        
        if (firstMilestone == null) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId,
                contract.getStatus(),
                "Cannot start contract work: Contract must have a milestone with orderIndex = 1."
            );
        }
        
        // Chỉ milestone 1 phải có task assignment và đã được accept
        List<AssignmentStatus> acceptedStatuses = List.of(
            AssignmentStatus.accepted_waiting,
            AssignmentStatus.ready_to_start,
            AssignmentStatus.in_progress,
            AssignmentStatus.completed
        );
        
        String firstMilestoneId = firstMilestone.getMilestoneId();
        Optional<TaskAssignment> firstMilestoneTaskOpt = taskAssignmentRepository
            .findByMilestoneIdAndStatusNot(firstMilestoneId, AssignmentStatus.cancelled);
        
        if (firstMilestoneTaskOpt.isEmpty()) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId,
                contract.getStatus(),
                String.format(
                    "Cannot start contract work: Milestone 1 '%s' has no active task assignment. " +
                    "Milestone 1 must have at least one active task assignment before starting contract.",
                    firstMilestone.getName()
                )
            );
        }
        
        TaskAssignment firstMilestoneTask = firstMilestoneTaskOpt.get();
        
        // Milestone 1 phải có task đã được accept
        if (!acceptedStatuses.contains(firstMilestoneTask.getStatus())) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId,
                contract.getStatus(),
                String.format(
                    "Cannot start contract work: Milestone 1 '%s' has an active task assignment but it is not accepted. " +
                    "The task assignment must be accepted before starting contract.",
                    firstMilestone.getName()
                )
            );
        }

        LocalDateTime startAt = requestedStartAt != null ? requestedStartAt : LocalDateTime.now();
        if (startAt.isBefore(contract.getDepositPaidAt())) {
            startAt = contract.getDepositPaidAt();
        }
        
        contract.setWorkStartAt(startAt);
        contract.setExpectedStartDate(startAt);


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
    public void handleMilestonePaid(MilestonePaidEvent event) {
        if (event == null) {
            throw new IllegalArgumentException("MilestonePaidEvent must not be null");
        }
        String contractId = event.getContractId();
        String milestoneId = event.getMilestoneId();
        Integer orderIndex = event.getOrderIndex();
        LocalDateTime paidAt = event.getPaidAt();
        BigDecimal paidAmount = event.getAmount();

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

        // Update installment status + audit amount/discount (if provided)
        installment.setStatus(InstallmentStatus.PAID);
        installment.setPaidAt(paidAt);
        installment.setPaidAmount(paidAmount);
        installment.setLateDiscountPercent(event.getLateDiscountPercent());
        installment.setLateDiscountAmount(event.getLateDiscountAmount());
        installment.setLateHours(event.getLateHours());
        installment.setGraceHours(event.getGraceHours());
        installment.setDiscountReason(event.getDiscountReason());
        installment.setDiscountPolicyVersion(event.getDiscountPolicyVersion());
        if (event.getLateDiscountAmount() != null || event.getLateDiscountPercent() != null) {
            installment.setDiscountAppliedAt(paidAt != null ? paidAt : LocalDateTime.now());
        }
        contractInstallmentRepository.save(installment);
        log.info("Updated milestone installment to PAID: contractId={}, installmentId={}, milestoneId={}", 
            contractId, installment.getInstallmentId(), milestoneId);
        
        // Update milestone work status: READY_FOR_PAYMENT → COMPLETED (khi milestone được thanh toán)
        // Lưu ý: Milestone cuối cùng sẽ được set COMPLETED sau khi tất cả installments đã paid
        if (milestone.getWorkStatus() == MilestoneWorkStatus.READY_FOR_PAYMENT) {
            milestone.setWorkStatus(MilestoneWorkStatus.COMPLETED);
            log.info("Updated milestone work status to COMPLETED after payment: contractId={}, milestoneId={}, orderIndex={}", 
                contractId, milestoneId, orderIndex);
        }
        
        contractMilestoneRepository.save(milestone);

        milestoneProgressService.markActualEnd(contractId, milestoneId, paidAt);
        
        // Gửi Kafka event về milestone paid notification cho manager
        try {
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : contractId;
            
            MilestonePaidNotificationEvent notificationEvent = MilestonePaidNotificationEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .milestoneId(milestoneId)
                    .milestoneName(milestone.getName())
                    .managerUserId(contract.getManagerUserId())
                    .amount(paidAmount != null ? paidAmount : installment.getAmount())
                    .currency(contract.getCurrency() != null ? contract.getCurrency().toString() : "VND")
                    .title("Milestone đã được thanh toán")
                    .content(String.format("Customer đã thanh toán milestone \"%s\" cho contract #%s. Số tiền: %s %s", 
                            milestone.getName(), 
                            contractLabel,
                            (paidAmount != null ? paidAmount : installment.getAmount()).toPlainString(),
                            contract.getCurrency() != null ? contract.getCurrency().toString() : "VND"))
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts/" + contractId)
                    .paidAt(paidAt)
                    .timestamp(LocalDateTime.now())
                    .build();
            
            JsonNode payload = objectMapper.valueToTree(notificationEvent);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(contractId);
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("Contract")
                    .eventType("milestone.paid.notification")
                    .eventPayload(payload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("Queued MilestonePaidNotificationEvent in outbox: eventId={}, contractId={}, milestoneId={}, managerUserId={}", 
                    notificationEvent.getEventId(), contractId, milestoneId, contract.getManagerUserId());
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue MilestonePaidNotificationEvent: contractId={}, milestoneId={}, error={}", 
                    contractId, milestoneId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room (SAU contract signed → CONTRACT_CHAT)
        String systemMessage = String.format(
            "💰 Customer đã thanh toán milestone \"%s\" cho contract #%s.\nSố tiền: %s %s",
            milestone.getName(),
            contract.getContractNumber(),
            (paidAmount != null ? paidAmount : installment.getAmount()).toPlainString(),
            contract.getCurrency() != null ? contract.getCurrency() : "VND"
        );
        publishChatSystemMessageEvent("CONTRACT_CHAT", contract.getContractId(), systemMessage);
        
        // Tự động unlock milestone tiếp theo: Khi milestone N được thanh toán → milestone N+1 READY_TO_START
        unlockNextMilestone(contractId, orderIndex);
        
        // Kiểm tra xem tất cả installments đã được thanh toán chưa
        List<ContractInstallment> allInstallments = contractInstallmentRepository
            .findByContractIdOrderByCreatedAtAsc(contractId);
        
        boolean allInstallmentsPaid = allInstallments.stream()
            .allMatch(i -> i.getStatus() == InstallmentStatus.PAID);
        
        // Kiểm tra xem tất cả milestones đã hoàn thành công việc chưa
        List<ContractMilestone> allMilestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        boolean allMilestonesCompleted = allMilestones.stream()
            .allMatch(m -> m.getWorkStatus() == MilestoneWorkStatus.COMPLETED);
        
        if (allInstallmentsPaid && (contract.getStatus() == ContractStatus.active 
                || contract.getStatus() == ContractStatus.active_pending_assignment)) {
            // Tất cả installments đã được thanh toán
            // Nhưng chỉ set contract COMPLETED nếu tất cả milestones cũng đã hoàn thành công việc
            if (allMilestonesCompleted) {
            contract.setStatus(ContractStatus.completed);
            contractRepository.save(contract);
                log.info("Contract status updated to COMPLETED: contractId={}, allInstallmentsCount={}, allMilestonesCount={}", 
                    contractId, allInstallments.size(), allMilestones.size());
            } else {
                log.info("All installments paid but not all milestones completed yet: contractId={}, allInstallmentsCount={}, allMilestonesCount={}", 
                    contractId, allInstallments.size(), allMilestones.size());
            }
            
            // Chỉ update work status của milestone cuối cùng thành COMPLETED nếu milestone đó đã thực sự hoàn thành công việc
            // (workStatus = READY_FOR_PAYMENT hoặc đã có task completed)
            if (!allMilestones.isEmpty()) {
                ContractMilestone lastMilestone = allMilestones.get(allMilestones.size() - 1);
                // Chỉ set COMPLETED nếu milestone đã hoàn thành công việc (READY_FOR_PAYMENT hoặc đã có task completed)
                // Không set COMPLETED nếu milestone chưa được assign (PLANNED, WAITING_ASSIGNMENT, etc.)
                if (lastMilestone.getWorkStatus() == MilestoneWorkStatus.READY_FOR_PAYMENT) {
                    // Milestone có payment và đã sẵn sàng thanh toán → set COMPLETED khi tất cả installments paid
                    lastMilestone.setWorkStatus(MilestoneWorkStatus.COMPLETED);
                    contractMilestoneRepository.save(lastMilestone);
                    log.info("Updated last milestone work status to COMPLETED (was READY_FOR_PAYMENT): contractId={}, milestoneId={}", 
                        contractId, lastMilestone.getMilestoneId());
                } else if (lastMilestone.getWorkStatus() != MilestoneWorkStatus.COMPLETED) {
                    // Milestone chưa hoàn thành công việc → không set COMPLETED
                    log.debug("Last milestone not ready for completion: contractId={}, milestoneId={}, workStatus={}", 
                        contractId, lastMilestone.getMilestoneId(), lastMilestone.getWorkStatus());
                }
            }
            
            // Chỉ update request status và gửi notification khi contract thực sự completed
            if (allMilestonesCompleted) {
                // Update request status to COMPLETED khi tất cả milestones đã được thanh toán và hoàn thành
            try {
                requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "completed");
                log.info("Updated request status to completed: requestId={}, contractId={}", 
                    contract.getRequestId(), contractId);
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to update request status to completed: requestId={}, contractId={}, error={}", 
                    contract.getRequestId(), contractId, e.getMessage(), e);
            }
            
                // Gửi notification cho manager khi tất cả milestones đã được thanh toán và hoàn thành
            try {
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : contractId;
                
                ContractNotificationEvent contractNotificationEvent = ContractNotificationEvent.builder()
                        .eventId(UUID.randomUUID())
                        .contractId(contractId)
                        .contractNumber(contractLabel)
                        .userId(contract.getManagerUserId())
                        .notificationType("ALL_MILESTONES_PAID")
                        .title("Tất cả milestones đã được thanh toán")
                        .content(String.format("Customer đã thanh toán tất cả milestones cho contract #%s. Contract đã hoàn thành thanh toán.", 
                                contractLabel))
                        .referenceType("CONTRACT")
                        .actionUrl("/manager/contracts/" + contractId)
                        .timestamp(LocalDateTime.now())
                        .build();
                
                publishToOutbox(contractNotificationEvent, contractId, "Contract", "contract.notification");
                log.info("Queued ContractNotificationEvent in outbox: eventId={}, contractId={}, userId={}", 
                        contractNotificationEvent.getEventId(), contractId, contract.getManagerUserId());
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue all milestones paid notification: userId={}, contractId={}, error={}", 
                        contract.getManagerUserId(), contractId, e.getMessage(), e);
            }
            
            // Gửi system message vào chat room khi tất cả milestones đã được thanh toán (SAU contract signed → CONTRACT_CHAT)
            String allPaidMessage = String.format(
                "✅ Customer đã thanh toán tất cả milestones cho contract #%s. Contract đã hoàn thành thanh toán.",
                contract.getContractNumber()
            );
            publishChatSystemMessageEvent("CONTRACT_CHAT", contract.getContractId(), allPaidMessage);
            }
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
                ? contract.getExpectedStartDate()
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
                .milestoneType(milestoneRequest.getMilestoneType())  // Set milestoneType từ request
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
     * Đặc biệt:
     * - Recording-only contracts: Recording milestone planned dates tính từ booking date (vì booking có trước)
     * - Arrangement+Recording contracts: Recording milestone planned dates KHÔNG phụ thuộc booking (booking không được làm dời milestone window)
     * @param unlockFirstMilestone nếu true, set milestone đầu tiên thành READY_TO_START
     */
    private void calculatePlannedDatesForAllMilestones(String contractId, LocalDateTime contractStartAt, boolean unlockFirstMilestone) {
        List<ContractMilestone> milestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        if (milestones.isEmpty()) {
            log.warn("No milestones found when calculating planned dates: contractId={}", contractId);
            return;
        }

        LocalDateTime cursor = contractStartAt;
        ContractType contractType = null;
        try {
            contractType = contractRepository.findById(contractId).map(Contract::getContractType).orElse(null);
        } catch (Exception e) {
            log.warn("Failed to fetch contract type when calculating planned dates: contractId={}, error={}",
                contractId, e.getMessage());
        }

        // Chỉ recording-only contract mới dùng booking date để set planned dates cho recording milestone
        final boolean useBookingForRecordingPlannedDates = contractType == ContractType.recording;
        for (ContractMilestone milestone : milestones) {
            Integer slaDays = milestone.getMilestoneSlaDays();
            
            // Recording milestone:
            // - recording-only: planned dates tính từ booking date
            // - arrangement_with_recording: planned dates tính từ cursor baseline
            if (milestone.getMilestoneType() == MilestoneType.recording && useBookingForRecordingPlannedDates) {
                boolean usedBookingDate = false;
                try {
                    Optional<StudioBooking> bookingOpt = 
                        studioBookingRepository.findByMilestoneId(milestone.getMilestoneId());
                    
                    if (bookingOpt.isPresent()) {
                        StudioBooking booking = bookingOpt.get();
                        if (booking.getBookingDate() != null) {
                            // PlannedStartAt = booking date + start time
                            LocalTime startTime = booking.getStartTime() != null ? 
                                booking.getStartTime() : 
                                LocalTime.of(9, 0);
                            
                            LocalDateTime bookingDateTime = booking.getBookingDate().atTime(startTime);
                            milestone.setPlannedStartAt(bookingDateTime);
                            
                            // PlannedDueDate = booking date + SLA days
                            LocalDateTime plannedDue;
                            if (slaDays == null || slaDays <= 0) {
                                log.warn("Recording milestone missing SLA days: contractId={}, milestoneId={}", 
                                    contractId, milestone.getMilestoneId());
                                plannedDue = bookingDateTime;
                            } else {
                                plannedDue = bookingDateTime.plusDays(slaDays);
                            }
                            milestone.setPlannedDueDate(plannedDue);
                            
                            // Update cursor cho milestones tiếp theo
                            cursor = plannedDue;
                            usedBookingDate = true;
                            
                            log.info("Recording milestone planned dates set from booking: contractId={}, milestoneId={}, bookingDate={}, plannedDue={}", 
                                contractId, milestone.getMilestoneId(), booking.getBookingDate(), plannedDue);
                        }
                    }
                } catch (Exception e) {
                    log.error("Error fetching booking for recording milestone: contractId={}, milestoneId={}, error={}", 
                        contractId, milestone.getMilestoneId(), e.getMessage());
                }
                
                // Fallback: Nếu không dùng được booking date, dùng cursor
                if (!usedBookingDate) {
                    log.warn("Recording milestone using cursor (no booking date): contractId={}, milestoneId={}", 
                        contractId, milestone.getMilestoneId());
                    milestone.setPlannedStartAt(cursor);
                    LocalDateTime plannedDue = (slaDays != null && slaDays > 0) ? 
                        cursor.plusDays(slaDays) : cursor;
                    milestone.setPlannedDueDate(plannedDue);
                    cursor = plannedDue;
                }
            } else {
                // Other milestones: logic cũ (tính từ cursor)
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
                cursor = plannedDue;
            }
            
            // Khi contract active, set milestone status = WAITING_ASSIGNMENT (chờ assign task)
            // Unlock milestone đầu tiên nếu được yêu cầu (sẽ được set READY_TO_START sau khi có task accepted)
            if (unlockFirstMilestone) {
                // Khi start contract work, milestone chưa có task → set WAITING_ASSIGNMENT
                if (milestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
                    milestone.setWorkStatus(MilestoneWorkStatus.WAITING_ASSIGNMENT);
                    log.info("Milestone set to WAITING_ASSIGNMENT when contract active: contractId={}, milestoneId={}, orderIndex={}",
                        contractId, milestone.getMilestoneId(), milestone.getOrderIndex());
                }
            }
        }

        contractMilestoneRepository.saveAll(milestones);
        log.info("Calculated planned baseline dates for all milestones: contractId={}, milestoneCount={}, unlockFirst={}",
            contractId, milestones.size(), unlockFirstMilestone);
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
            .paidAmount(installment.getPaidAmount())
            .lateDiscountPercent(installment.getLateDiscountPercent())
            .lateDiscountAmount(installment.getLateDiscountAmount())
            .lateHours(installment.getLateHours())
            .graceHours(installment.getGraceHours())
            .discountReason(installment.getDiscountReason())
            .discountPolicyVersion(installment.getDiscountPolicyVersion())
            .discountAppliedAt(installment.getDiscountAppliedAt())
            .currency(installment.getCurrency())
            .status(installment.getStatus())
            .gateCondition(installment.getGateCondition())
            .paidAt(installment.getPaidAt())
            .createdAt(installment.getCreatedAt())
            .updatedAt(installment.getUpdatedAt())
            .build();
    }

    private MilestonePaymentQuoteResponse buildMilestonePaymentQuote(
        Contract contract,
        ContractMilestone milestone,
        ContractInstallment installment,
        List<ContractMilestone> allMilestones
    ) {
        BigDecimal baseAmount = installment != null ? installment.getAmount() : null;
        String currency = (installment != null && installment.getCurrency() != null)
            ? installment.getCurrency().name()
            : (contract != null && contract.getCurrency() != null ? contract.getCurrency().name() : null);

        LocalDateTime targetDeadline = resolveMilestoneTargetDeadline(milestone, contract, allMilestones);
        LocalDateTime firstSubmissionAt = milestone != null ? milestone.getFirstSubmissionAt() : null;

        // Cache policy values once to avoid repeated null checks
        Integer graceHours = 6; // default
        BigDecimal tier0To24Percent = new BigDecimal("5");
        BigDecimal tier24To72Percent = new BigDecimal("10");
        BigDecimal tierOver72Percent = new BigDecimal("20");
        BigDecimal capPercent = new BigDecimal("20");
        String policyVersion = "late_discount_v1";
        
        if (lateDiscountPolicyProperties != null) {
            if (lateDiscountPolicyProperties.getGraceHours() != null) {
                graceHours = lateDiscountPolicyProperties.getGraceHours();
            }
            if (lateDiscountPolicyProperties.getTier0To24HoursPercent() != null) {
                tier0To24Percent = lateDiscountPolicyProperties.getTier0To24HoursPercent();
            }
            if (lateDiscountPolicyProperties.getTier24To72HoursPercent() != null) {
                tier24To72Percent = lateDiscountPolicyProperties.getTier24To72HoursPercent();
            }
            if (lateDiscountPolicyProperties.getTierOver72HoursPercent() != null) {
                tierOver72Percent = lateDiscountPolicyProperties.getTierOver72HoursPercent();
            }
            if (lateDiscountPolicyProperties.getCapPercent() != null) {
                capPercent = lateDiscountPolicyProperties.getCapPercent();
            }
            if (lateDiscountPolicyProperties.getPolicyVersion() != null) {
                policyVersion = lateDiscountPolicyProperties.getPolicyVersion();
            }
        }

        Long lateHours = null;
        BigDecimal discountPercent = null;
        BigDecimal discountAmount = null;
        BigDecimal payableAmount = baseAmount;

        if (baseAmount != null
            && baseAmount.compareTo(BigDecimal.ZERO) > 0
            && targetDeadline != null
            && firstSubmissionAt != null) {

            LocalDateTime deadlineWithGrace = targetDeadline.plusHours(graceHours);
            if (firstSubmissionAt.isAfter(deadlineWithGrace)) {
                long lateMinutes = java.time.Duration.between(deadlineWithGrace, firstSubmissionAt).toMinutes();
                lateHours = (long) Math.ceil(lateMinutes / 60.0);

                // Apply tiered discount based on late duration:
                // - 0-24 hours (inclusive): tier0To24Percent (e.g., 5%)
                // - >24-72 hours (inclusive): tier24To72Percent (e.g., 10%)
                // - >72 hours: tierOver72Percent (e.g., 20%)
                if (lateMinutes <= 24L * 60L) {
                    discountPercent = tier0To24Percent;
                } else if (lateMinutes <= 72L * 60L) {
                    discountPercent = tier24To72Percent;
                } else {
                    discountPercent = tierOver72Percent;
                }

                // Apply cap
                if (discountPercent.compareTo(capPercent) > 0) {
                    discountPercent = capPercent;
                }

                if (discountPercent.compareTo(BigDecimal.ZERO) > 0) {
                    discountAmount = baseAmount
                        .multiply(discountPercent)
                        .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
                    payableAmount = baseAmount.subtract(discountAmount);
                    if (payableAmount.compareTo(BigDecimal.ZERO) < 0) {
                        payableAmount = BigDecimal.ZERO;
                    }
                }
            } else {
                lateHours = 0L;
            }
        }

        return MilestonePaymentQuoteResponse.builder()
            .contractId(contract != null ? contract.getContractId() : null)
            .milestoneId(milestone != null ? milestone.getMilestoneId() : null)
            .installmentId(installment != null ? installment.getInstallmentId() : null)
            .currency(currency)
            .baseAmount(baseAmount)
            .lateDiscountPercent(discountPercent)
            .lateDiscountAmount(discountAmount)
            .payableAmount(payableAmount)
            .lateHours(lateHours)
            .graceHours(graceHours)
            .policyVersion(policyVersion)
            .targetDeadline(targetDeadline)
            .firstSubmissionAt(firstSubmissionAt)
            .computedAt(LocalDateTime.now())
            .build();
    }
    
    /**
     * Unlock milestone tiếp theo khi milestone hiện tại được hoàn thành (COMPLETED hoặc thanh toán)
     * 
     * @param contractId ID của contract
     * @param currentOrderIndex Order index của milestone hiện tại đã hoàn thành
     */
    public void unlockNextMilestone(String contractId, Integer currentOrderIndex) {
        if (currentOrderIndex == null || currentOrderIndex <= 0) {
            return;
        }
        
        Optional<ContractMilestone> nextMilestoneOpt = contractMilestoneRepository
            .findByContractIdAndOrderIndex(contractId, currentOrderIndex + 1);
        
        if (nextMilestoneOpt.isPresent()) {
            ContractMilestone nextMilestone = nextMilestoneOpt.get();
            String milestoneId = nextMilestone.getMilestoneId();
            
            // Reload milestone từ DB để đảm bảo có data mới nhất (tránh race condition với transaction tạo task)
            // Nếu milestone đã được update bởi transaction khác, reload sẽ lấy version mới nhất
            nextMilestone = contractMilestoneRepository
                .findByMilestoneIdAndContractId(milestoneId, contractId)
                .orElse(null);
            
            if (nextMilestone == null) {
                log.warn("Milestone not found after reload: contractId={}, milestoneId={}", contractId, milestoneId);
                return;
            }
            
            // Milestone tiếp theo chuyển sang:
            // - WAITING_ASSIGNMENT: nếu chưa có task
            // - WAITING_SPECIALIST_ACCEPT: nếu đã có task nhưng chưa accepted
            // - TASK_ACCEPTED_WAITING_ACTIVATION: nếu đã có task và đã accepted
            if (nextMilestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
                // Kiểm tra xem milestone này đã có task assignment chưa
                // Check tasks với tất cả status (trừ cancelled) để tránh miss task mới được tạo
                List<TaskAssignment> tasks = taskAssignmentRepository
                    .findByContractIdAndMilestoneId(contractId, milestoneId)
                    .stream()
                    .filter(task -> task.getStatus() != AssignmentStatus.cancelled)
                    .toList();
                
                // Reload milestone một lần nữa trước khi update (double-check để tránh race condition)
                ContractMilestone milestoneToUpdate = contractMilestoneRepository
                    .findByMilestoneIdAndContractId(milestoneId, contractId)
                    .orElse(null);
                
                if (milestoneToUpdate == null || milestoneToUpdate.getWorkStatus() != MilestoneWorkStatus.PLANNED) {
                    log.info("Milestone status changed by another transaction, skipping unlock: contractId={}, milestoneId={}, currentStatus={}", 
                        contractId, milestoneId, milestoneToUpdate != null ? milestoneToUpdate.getWorkStatus() : "NOT_FOUND");
                    return;
                }
                
                if (tasks.isEmpty()) {
                    // Chưa có task → chuyển WAITING_ASSIGNMENT
                    milestoneToUpdate.setWorkStatus(MilestoneWorkStatus.WAITING_ASSIGNMENT);
                    contractMilestoneRepository.save(milestoneToUpdate);
                    log.info("Milestone unlocked to WAITING_ASSIGNMENT (no task yet): contractId={}, milestoneId={}, orderIndex={}", 
                        contractId, milestoneId, milestoneToUpdate.getOrderIndex());
                } else {
                    // Đã có task → kiểm tra task đã accepted chưa
                    boolean hasAcceptedTask = tasks.stream()
                        .anyMatch(task -> task.getStatus() == AssignmentStatus.accepted_waiting);
                    
                    if (hasAcceptedTask) {
                        // Đã có task accepted → chuyển TASK_ACCEPTED_WAITING_ACTIVATION
                        milestoneToUpdate.setWorkStatus(MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
                        contractMilestoneRepository.save(milestoneToUpdate);
                        log.info("Milestone unlocked to TASK_ACCEPTED_WAITING_ACTIVATION (has accepted task): contractId={}, milestoneId={}, orderIndex={}", 
                            contractId, milestoneId, milestoneToUpdate.getOrderIndex());
                    } else {
                        // Đã có task nhưng chưa accepted → chuyển WAITING_SPECIALIST_ACCEPT
                        milestoneToUpdate.setWorkStatus(MilestoneWorkStatus.WAITING_SPECIALIST_ACCEPT);
                        contractMilestoneRepository.save(milestoneToUpdate);
                        log.info("Milestone unlocked to WAITING_SPECIALIST_ACCEPT (has task but not accepted): contractId={}, milestoneId={}, orderIndex={}", 
                            contractId, milestoneId, milestoneToUpdate.getOrderIndex());
                    }
                }
                
                // Update nextMilestone reference để dùng ở phần sau
                nextMilestone = milestoneToUpdate;
            }

            // Activate assignments nếu milestone đã có task accepted
            // Với recording milestone, nếu chưa có studio booking thì TaskAssignmentService sẽ tự log và skip
            taskAssignmentService.activateAssignmentsForMilestone(contractId, nextMilestone.getMilestoneId());
            
            // Nếu milestone tiếp theo đã có task accepted/completed (nhưng chưa có actualStartAt vì milestone trước đó chưa completed),
            // thì set actualStartAt ngay khi milestone trước đó được hoàn thành
            milestoneProgressService.evaluateActualStart(contractId, nextMilestone.getMilestoneId());
        }
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
        
        if (installmentOpt.isEmpty()) {
            log.debug("No installment found for milestone: contractId={}, milestoneId={}", contractId, milestoneId);
            return;
        }
        
        ContractInstallment installment = installmentOpt.get();
        
        // Chỉ mở nếu installment có gateCondition = AFTER_MILESTONE_DONE và status = PENDING
        if (installment.getGateCondition() != GateCondition.AFTER_MILESTONE_DONE) {
            log.debug("Installment has different gateCondition, skipping: contractId={}, milestoneId={}, gateCondition={}", 
                contractId, milestoneId, installment.getGateCondition());
            return;
        }
        
        if (installment.getStatus() != InstallmentStatus.PENDING) {
            log.debug("Installment already opened or paid, skipping: contractId={}, milestoneId={}, status={}", 
                contractId, milestoneId, installment.getStatus());
            return;
        }
        
        // Mở installment DUE
        installment.setStatus(InstallmentStatus.DUE);
        contractInstallmentRepository.save(installment);
        log.info("✅ Auto-opened milestone installment for payment: contractId={}, milestoneId={}, installmentId={}", 
            contractId, milestoneId, installment.getInstallmentId());
        
        // Gửi Kafka event về milestone ready for payment notification cho customer
        try {
            Contract contract = contractRepository.findById(contractId).orElse(null);
            ContractMilestone milestone = contractMilestoneRepository.findById(milestoneId).orElse(null);
            
            if (contract != null && milestone != null) {
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : contractId;
                String milestoneName = milestone.getName() != null && !milestone.getName().isBlank()
                    ? milestone.getName()
                    : "Milestone " + (milestone.getOrderIndex() != null ? milestone.getOrderIndex() : "");
                String currency = installment.getCurrency() != null 
                    ? installment.getCurrency().toString() 
                    : (contract.getCurrency() != null ? contract.getCurrency().toString() : "VND");
                
                MilestoneReadyForPaymentNotificationEvent event = MilestoneReadyForPaymentNotificationEvent.builder()
                    .eventId(UUID.randomUUID())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .milestoneId(milestoneId)
                    .milestoneName(milestoneName)
                    .customerUserId(contract.getUserId())
                    .amount(installment.getAmount())
                    .currency(currency)
                    .title("Milestone sẵn sàng thanh toán")
                    .content(String.format("Milestone \"%s\" của contract #%s đã sẵn sàng thanh toán. Số tiền: %s %s. Vui lòng thanh toán để tiếp tục.", 
                        milestoneName, contractLabel, installment.getAmount().toPlainString(), currency))
                    .referenceType("CONTRACT")
                    .actionUrl("/contracts/" + contractId)
                    .timestamp(LocalDateTime.now())
                    .build();
                
                JsonNode payload = objectMapper.valueToTree(event);
                UUID aggregateId;
                try {
                    aggregateId = UUID.fromString(contractId);
                } catch (IllegalArgumentException ex) {
                    aggregateId = UUID.randomUUID();
                }
                
                OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("Contract")
                    .eventType("milestone.ready.for.payment.notification")
                    .eventPayload(payload)
                    .build();
                
                outboxEventRepository.save(outboxEvent);
                log.info("Queued MilestoneReadyForPaymentNotificationEvent in outbox: eventId={}, contractId={}, milestoneId={}, customerUserId={}", 
                    event.getEventId(), contractId, milestoneId, contract.getUserId());
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue MilestoneReadyForPaymentNotificationEvent: contractId={}, milestoneId={}, error={}", 
                contractId, milestoneId, e.getMessage(), e);
        }
    }
    
    /**
     * Publish event để gửi system message vào chat room
     * Chat Service sẽ lắng nghe event này và gửi message vào đúng room
     */
    private void publishChatSystemMessageEvent(String roomType, String contextId, String message) {
        try {
            ChatSystemMessageEvent event = ChatSystemMessageEvent.builder()
                    .eventId(UUID.randomUUID())
                    .roomType(roomType)  // "REQUEST_CHAT" hoặc "CONTRACT_CHAT"
                    .contextId(contextId)  // requestId hoặc contractId
                    .message(message)
                    .timestamp(LocalDateTime.now())
                    .build();
            
            JsonNode payload = objectMapper.valueToTree(event);
            
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(contextId);
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("ChatMessage")
                    .eventType("chat.system.message")
                    .eventPayload(payload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("Queued ChatSystemMessageEvent in outbox: eventId={}, roomType={}, contextId={}", 
                    event.getEventId(), roomType, contextId);
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue ChatSystemMessageEvent: roomType={}, contextId={}, error={}", 
                    roomType, contextId, e.getMessage(), e);
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
        
        if (contract.getCustomerSignatureS3Key() == null || contract.getCustomerSignatureS3Key().isEmpty()) {
            throw SignatureImageNotFoundException.forContract(contractId);
        }
        
        try {
            // Download image from S3 using file key
            byte[] imageBytes = s3Service.downloadFile(contract.getCustomerSignatureS3Key());
            
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
            // Upload PDF to S3 and get file key only (not URL for security)
            String fileKey = s3Service.uploadFileAndReturnKey(
                    pdfInputStream,
                    fileName,
                    "application/pdf",
                    fileSize,
                    "contracts/pdfs"
            );

            // Create File record (store file key, not URL)
            File pdfFile = File.builder()
                    .fileName(fileName)
                    .fileKeyS3(fileKey)  // Store S3 object key
                    .fileSize(fileSize)
                    .mimeType("application/pdf")
                    .fileSource(FileSourceType.contract_pdf)  // Or create new type for contract_pdf
                    .contentType(ContentType.contract_pdf)
                    .description("Signed contract PDF for contract: " + contract.getContractNumber())
                    .createdBy(currentUserId)
                    .requestId(contract.getRequestId())
                    .fileStatus(FileStatus.uploaded)
                    .deliveredToCustomer(true)  // Contract PDF is delivered to customer
                    .deliveredAt(LocalDateTime.now())
                    .deliveredBy(currentUserId)
                    .build();

            File savedFile = fileRepository.save(pdfFile);

            // Link PDF with contract
            contract.setFileId(savedFile.getFileId());
            contractRepository.save(contract);

            log.info("Contract PDF uploaded successfully: contractId={}, fileId={}, fileKey={}", 
                    contractId, savedFile.getFileId(), fileKey);

            return savedFile.getFileId();
        } catch (Exception e) {
            log.error("Error uploading contract PDF for contract {}: {}", contractId, e.getMessage(), e);
            throw ContractPdfUploadException.failed(contractId, e.getMessage(), e);
        }
    }
}

