package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.ChatServiceFeignClient;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.NotificationServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.request.CreateNotificationRequest;
import com.mutrapro.project_service.dto.request.SendSystemMessageRequest;
import com.mutrapro.project_service.dto.response.ChatRoomResponse;
import com.mutrapro.project_service.dto.response.ContractMilestoneResponse;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.dto.response.RequestContractInfo;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import com.mutrapro.project_service.enums.MilestoneBillingType;
import com.mutrapro.project_service.enums.MilestonePaymentStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.SignSessionStatus;
import com.mutrapro.project_service.exception.ContractAlreadyExistsException;
import com.mutrapro.project_service.dto.request.CustomerActionRequest;
import com.mutrapro.project_service.exception.ContractExpiredException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.exception.InvalidRequestIdException;
import com.mutrapro.project_service.exception.InvalidRequestStatusException;
import com.mutrapro.project_service.exception.ServiceRequestNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.UserNotAuthenticatedException;
import com.mutrapro.project_service.mapper.ContractMapper;
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
    ContractMapper contractMapper;
    RequestServiceFeignClient requestServiceFeignClient;
    ChatServiceFeignClient chatServiceFeignClient;
    NotificationServiceFeignClient notificationServiceFeignClient;
    ContractSignSessionRepository contractSignSessionRepository;
    FileRepository fileRepository;
    
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
                        || status == ContractStatus.active;
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
        
        BigDecimal depositAmount = totalPrice.multiply(depositPercent).divide(BigDecimal.valueOf(100), 2, 
            java.math.RoundingMode.HALF_UP);
        BigDecimal finalAmount = totalPrice.subtract(depositAmount);
        
        // Tính SLA days (default values based on contract type)
        Integer slaDays = createRequest.getSlaDays() != null
            ? createRequest.getSlaDays()
            : getDefaultSlaDays(contractType);
        
        // Revision deadline days - lấy từ request
        Integer revisionDeadlineDays = createRequest.getRevisionDeadlineDays();
        
        // KHÔNG set expectedStartDate và dueDate lúc tạo contract
        // Chỉ set khi customer KÝ để đảm bảo tính đúng từ ngày ký
        Instant expectedStartDate = null;
        Instant dueDate = null;
        
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
            .depositAmount(depositAmount)
            .finalAmount(finalAmount)
            .expectedStartDate(expectedStartDate)
            .dueDate(dueDate)
            .slaDays(slaDays)
            .autoDueDate(createRequest.getAutoDueDate() != null ? createRequest.getAutoDueDate() : true)
            .freeRevisionsIncluded(createRequest.getFreeRevisionsIncluded() != null 
                ? createRequest.getFreeRevisionsIncluded() : 1)
            .additionalRevisionFeeVnd(createRequest.getAdditionalRevisionFeeVnd())
            .revisionDeadlineDays(revisionDeadlineDays)
            .expiresAt(createRequest.getExpiresAt())
            // Snapshot contact info
            .nameSnapshot(serviceRequest.getContactName() != null ? serviceRequest.getContactName() : "N/A")
            .phoneSnapshot(serviceRequest.getContactPhone() != null ? serviceRequest.getContactPhone() : "N/A")
            .emailSnapshot(serviceRequest.getContactEmail() != null ? serviceRequest.getContactEmail() : "N/A")
            .createdAt(Instant.now())
            .build();
        
        Contract saved = contractRepository.save(contract);
        log.info("Created contract from service request: contractId={}, requestId={}, contractNumber={}", 
            saved.getContractId(), requestId, contractNumber);
        
        // Tạo milestones dựa trên contract type
        createMilestonesForContract(saved);
        
        ContractResponse response = contractMapper.toResponse(saved);
        return enrichWithMilestones(response);
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
        boolean needsRecalculation = false;
        
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
            needsRecalculation = true;
        }
        
        if (updateRequest.getCurrency() != null) {
            contract.setCurrency(updateRequest.getCurrency());
        }
        
        if (updateRequest.getDepositPercent() != null) {
            contract.setDepositPercent(updateRequest.getDepositPercent());
            needsRecalculation = true;
        }
        
        // Recalculate deposit và final amount nếu cần
        if (needsRecalculation) {
            BigDecimal totalPrice = contract.getTotalPrice();
            BigDecimal depositPercent = contract.getDepositPercent();
            BigDecimal depositAmount = totalPrice.multiply(depositPercent).divide(BigDecimal.valueOf(100), 2, 
                java.math.RoundingMode.HALF_UP);
            BigDecimal finalAmount = totalPrice.subtract(depositAmount);
            
            contract.setDepositAmount(depositAmount);
            contract.setFinalAmount(finalAmount);
        }
        
        if (updateRequest.getExpectedStartDate() != null) {
            contract.setExpectedStartDate(updateRequest.getExpectedStartDate());
        }
        
        if (updateRequest.getSlaDays() != null) {
            contract.setSlaDays(updateRequest.getSlaDays());
        }
        
        if (updateRequest.getAutoDueDate() != null) {
            contract.setAutoDueDate(updateRequest.getAutoDueDate());
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
        return enrichWithMilestones(response);
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
     */
    @Transactional(readOnly = true)
    public ContractResponse getContractById(String contractId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        ContractResponse response = contractMapper.toResponse(contract);
        
        // Load milestones và map vào response
        return enrichWithMilestones(response);
    }
    
    /**
     * Map ContractMilestone entity to ContractMilestoneResponse DTO
     */
    private ContractMilestoneResponse mapToMilestoneResponse(ContractMilestone milestone) {
        return ContractMilestoneResponse.builder()
            .milestoneId(milestone.getMilestoneId())
            .contractId(milestone.getContractId())
            .name(milestone.getName())
            .description(milestone.getDescription())
            .orderIndex(milestone.getOrderIndex())
            .workStatus(milestone.getWorkStatus())
            .billingType(milestone.getBillingType())
            .billingValue(milestone.getBillingValue())
            .amount(milestone.getAmount())
            .paymentStatus(milestone.getPaymentStatus())
            .plannedDueDate(milestone.getPlannedDueDate())
            .paidAt(milestone.getPaidAt())
            .createdAt(milestone.getCreatedAt())
            .updatedAt(milestone.getUpdatedAt())
            .build();
    }
    
    /**
     * Enrich ContractResponse với milestones
     */
    private ContractResponse enrichWithMilestones(ContractResponse response) {
        if (response == null || response.getContractId() == null) {
            return response;
        }
        
        List<ContractMilestone> milestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(response.getContractId());
        
        List<ContractMilestoneResponse> milestoneResponses = milestones.stream()
            .map(this::mapToMilestoneResponse)
            .collect(Collectors.toList());
        
        response.setMilestones(milestoneResponses);
        
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
                    .actionUrl("/user/requests/" + contract.getRequestId())
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
        return enrichWithMilestones(response);
    }
    
    /**
     * Lấy danh sách contracts theo requestId
     * - Nếu user là CUSTOMER: chỉ trả về contracts đã được gửi cho customer (sentToCustomerAt != null)
     * - Nếu user là MANAGER/ADMIN: trả về tất cả contracts
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> getContractsByRequestId(String requestId) {
        List<Contract> contracts = contractRepository.findByRequestId(requestId);
        
        // Lấy role của user hiện tại
        List<String> userRoles = getCurrentUserRoles();
        boolean isCustomer = userRoles.stream()
            .anyMatch(role -> role.equalsIgnoreCase("CUSTOMER"));
        boolean isManagerOrAdmin = userRoles.stream()
            .anyMatch(role -> role.equalsIgnoreCase("MANAGER") || role.equalsIgnoreCase("ADMIN"));
        
        // Nếu là customer: chỉ hiển thị contracts đã được gửi cho customer
        // Ẩn tất cả contracts chưa được gửi (sentToCustomerAt == null)
        // Bao gồm: DRAFT, CANCELED_BY_MANAGER (chưa sent), và bất kỳ status nào chưa sent
        if (isCustomer && !isManagerOrAdmin) {
            contracts = contracts.stream()
                .filter(contract -> {
                    // Chỉ hiển thị nếu contract đã được gửi cho customer
                    // sentToCustomerAt != null
                    return contract.getSentToCustomerAt() != null;
                })
                .collect(Collectors.toList());
        }
        
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
                    .actionUrl("/manager/contracts-list")
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
        return enrichWithMilestones(response);
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
            throw new IllegalArgumentException("Reason is required for request change");
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
                    .actionUrl("/manager/contracts-list")
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
        return enrichWithMilestones(response);
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
                contract.getStatus() == ContractStatus.active) {
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
            throw new IllegalArgumentException("Reason is required for cancellation");
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
                    .actionUrl("/manager/contracts-list")
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
        return enrichWithMilestones(response);
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
            contract.getStatus() == ContractStatus.active) {
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
            throw new IllegalArgumentException("Reason is required for cancellation");
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
                        .actionUrl("/user/requests/" + contract.getRequestId())
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
        return enrichWithMilestones(response);
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
        
        ContractMilestone milestone = contractMilestoneRepository.findById(milestoneId)
            .orElseThrow(() -> new IllegalArgumentException("Milestone not found: " + milestoneId));
        
        // Validation: Milestone từ thứ 2 trở đi chỉ được thanh toán khi work status = READY_FOR_PAYMENT hoặc COMPLETED
        // Milestone đầu tiên (orderIndex = 1) có thể thanh toán ngay khi DUE
        if (orderIndex > 1) {
            MilestoneWorkStatus workStatus = milestone.getWorkStatus();
            if (workStatus != MilestoneWorkStatus.READY_FOR_PAYMENT 
                && workStatus != MilestoneWorkStatus.COMPLETED) {
                log.warn("❌ Cannot pay milestone: milestone must be READY_FOR_PAYMENT or COMPLETED. " +
                    "contractId={}, milestoneId={}, orderIndex={}, currentWorkStatus={}", 
                    contractId, milestoneId, orderIndex, workStatus);
                throw new IllegalStateException(
                    String.format("Milestone %d chỉ có thể thanh toán khi công việc đã hoàn thành (READY_FOR_PAYMENT hoặc COMPLETED). " +
                        "Hiện tại work status: %s", orderIndex, workStatus));
            }
        }
        
        // Update milestone payment status và paidAt
        milestone.setPaymentStatus(MilestonePaymentStatus.PAID);
        milestone.setPaidAt(paidAt);
        milestone.setUpdatedAt(Instant.now());
        
        // Update milestone work status:
        // - Milestone đầu tiên (orderIndex = 1): PLANNED → COMPLETED khi thanh toán thành công
        // - Milestone từ thứ 2 trở đi: đã có work status = READY_FOR_PAYMENT hoặc COMPLETED (không cần update)
        if (orderIndex == 1 && milestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
            milestone.setWorkStatus(MilestoneWorkStatus.COMPLETED);
            log.info("✅ Milestone 1 completed after payment: contractId={}, milestoneId={}", 
                contractId, milestoneId);
        }
        
        contractMilestoneRepository.save(milestone);
        log.info("Updated milestone payment status to PAID: contractId={}, milestoneId={}, orderIndex={}", 
            contractId, milestoneId, orderIndex);
        
        // Gửi notification cho manager khi milestone được thanh toán
        try {
            CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                    .userId(contract.getManagerUserId())
                    .type(NotificationType.MILESTONE_PAID)
                    .title("Milestone đã được thanh toán")
                    .content(String.format("Customer đã thanh toán milestone \"%s\" cho contract #%s. Số tiền: %s %s", 
                            milestone.getName(), 
                            contract.getContractNumber(),
                            milestone.getAmount().toPlainString(),
                            contract.getCurrency() != null ? contract.getCurrency() : "VND"))
                    .referenceId(contractId)
                    .referenceType("CONTRACT")
                    .actionUrl("/manager/contracts/" + contractId)
                    .build();
            
            notificationServiceFeignClient.createNotification(notifRequest);
            log.info("Sent milestone paid notification to manager: userId={}, contractId={}, milestoneId={}", 
                    contract.getManagerUserId(), contractId, milestoneId);
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to send milestone paid notification: userId={}, contractId={}, milestoneId={}, error={}", 
                    contract.getManagerUserId(), contractId, milestoneId, e.getMessage(), e);
        }
        
        // Gửi system message vào chat room
        String systemMessage = String.format(
            "💰 Customer đã thanh toán milestone \"%s\" cho contract #%s.\nSố tiền: %s %s",
            milestone.getName(),
            contract.getContractNumber(),
            milestone.getAmount().toPlainString(),
            contract.getCurrency() != null ? contract.getCurrency() : "VND"
        );
        sendSystemMessageToChat(contract.getRequestId(), systemMessage);
        
        // Nếu là milestone đầu tiên (orderIndex = 1) và contract chưa active
        if (orderIndex == 1 && contract.getStatus() == ContractStatus.signed) {
            // Set expectedStartDate = ngày thanh toán milestone đầu tiên
            contract.setExpectedStartDate(paidAt);
            
            // Tính lại dueDate từ expectedStartDate + SLA days
            Integer slaDays = contract.getSlaDays();
            if (slaDays != null && slaDays > 0) {
                Instant newDueDate = paidAt.plusSeconds(slaDays * 24L * 60 * 60);
                contract.setDueDate(newDueDate);
                log.info("Set due date from first milestone paid date: contractId={}, paidAt={}, dueDate={}, slaDays={}", 
                    contractId, paidAt, newDueDate, slaDays);
            }
            
            // Update status từ "signed" → "active" (đã thanh toán milestone đầu tiên, có thể bắt đầu công việc)
            contract.setStatus(ContractStatus.active);
            contractRepository.save(contract);
            log.info("Updated contract to active after first milestone paid: contractId={}, expectedStartDate={}, status=active", 
                contractId, paidAt);
            
            // Update request status từ "contract_signed" → "in_progress" (đã thanh toán, bắt đầu làm việc)
            try {
                requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), "in_progress");
                log.info("Updated request status to in_progress: requestId={}, contractId={}", 
                    contract.getRequestId(), contractId);
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to update request status to in_progress: requestId={}, contractId={}, error={}", 
                    contract.getRequestId(), contractId, e.getMessage(), e);
            }
        }
        
        // Tự động kích hoạt milestone tiếp theo: Khi milestone N được thanh toán → milestone N+1 bắt đầu làm việc
        Optional<ContractMilestone> nextMilestoneOpt = contractMilestoneRepository
            .findByContractIdAndOrderIndex(contractId, orderIndex + 1);
        
        if (nextMilestoneOpt.isPresent()) {
            ContractMilestone nextMilestone = nextMilestoneOpt.get();
            
            // Milestone tiếp theo tự động bắt đầu làm việc (IN_PROGRESS) khi milestone trước được thanh toán
            if (nextMilestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
                nextMilestone.setWorkStatus(MilestoneWorkStatus.IN_PROGRESS);
                nextMilestone.setUpdatedAt(Instant.now());
                log.info("✅ Auto-started next milestone work: contractId={}, milestoneId={}, orderIndex={}, workStatus=IN_PROGRESS", 
                    contractId, nextMilestone.getMilestoneId(), nextMilestone.getOrderIndex());
            }
            
            // Payment status: Milestone tiếp theo chuyển từ NOT_DUE → DUE (nhưng chỉ thanh toán được khi hoàn thành công việc)
            // Logic thanh toán sẽ được kiểm tra ở frontend/backend khi customer cố gắng thanh toán
            if (nextMilestone.getPaymentStatus() == MilestonePaymentStatus.NOT_DUE) {
                nextMilestone.setPaymentStatus(MilestonePaymentStatus.DUE);
                nextMilestone.setUpdatedAt(Instant.now());
                contractMilestoneRepository.save(nextMilestone);
                log.info("✅ Auto-opened next milestone for payment (will be payable when work completed): contractId={}, milestoneId={}, orderIndex={}", 
                    contractId, nextMilestone.getMilestoneId(), nextMilestone.getOrderIndex());
            } else {
                // Nếu đã update work status, cần save lại
                contractMilestoneRepository.save(nextMilestone);
            }
        }
        
        // Kiểm tra xem tất cả milestones đã được thanh toán chưa
        List<ContractMilestone> allMilestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        
        boolean allMilestonesPaid = allMilestones.stream()
            .allMatch(m -> m.getPaymentStatus() == MilestonePaymentStatus.PAID);
        
        if (allMilestonesPaid && contract.getStatus() == ContractStatus.active) {
            // Tất cả milestones đã được thanh toán → contract completed
            // Note: ContractStatus có thể không có "completed", có thể dùng status khác hoặc giữ nguyên active
            // contract.setStatus(ContractStatus.completed);
            contractRepository.save(contract);
            log.info("All milestones paid for contract: contractId={}, allMilestonesCount={}", 
                contractId, allMilestones.size());
            
            // Update work status của milestone cuối cùng thành COMPLETED
            ContractMilestone lastMilestone = allMilestones.get(allMilestones.size() - 1);
            if (lastMilestone.getWorkStatus() != MilestoneWorkStatus.COMPLETED) {
                lastMilestone.setWorkStatus(MilestoneWorkStatus.COMPLETED);
                lastMilestone.setUpdatedAt(Instant.now());
                contractMilestoneRepository.save(lastMilestone);
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
     * Tạo milestones cho contract dựa trên contract type và depositPercent
     * @param contract Contract đã được tạo
     */
    private void createMilestonesForContract(Contract contract) {
        ContractType contractType = contract.getContractType();
        String contractId = contract.getContractId();
        BigDecimal totalPrice = contract.getTotalPrice() != null ? contract.getTotalPrice() : BigDecimal.ZERO;
        BigDecimal depositPercent = contract.getDepositPercent() != null 
            ? contract.getDepositPercent() 
            : BigDecimal.valueOf(40.0);  // Default 40% nếu không có
        
        List<ContractMilestone> milestones = new java.util.ArrayList<>();
        
        switch (contractType) {
            case transcription -> {
                // Transcription: 2 milestones (depositPercent, 100% - depositPercent)
                BigDecimal finalPercent = BigDecimal.valueOf(100).subtract(depositPercent);
                milestones.add(createMilestone(
                    contractId, 1, 
                    "Milestone 1: Deposit & Start Transcription",
                    "Khách thanh toán cọc, hệ thống bắt đầu ký âm",
                    MilestoneBillingType.PERCENTAGE, depositPercent,
                    totalPrice, MilestonePaymentStatus.DUE
                ));
                milestones.add(createMilestone(
                    contractId, 2,
                    "Milestone 2: Final Transcription Delivery",
                    "Giao bản ký âm hoàn chỉnh, khách xác nhận",
                    MilestoneBillingType.PERCENTAGE, finalPercent,
                    totalPrice, MilestonePaymentStatus.NOT_DUE
                ));
            }
            case arrangement_with_recording -> {
                // Arrangement with Recording: 2 milestones (depositPercent, 100% - depositPercent)
                BigDecimal finalPercent = BigDecimal.valueOf(100).subtract(depositPercent);
                milestones.add(createMilestone(
                    contractId, 1,
                    "Milestone 1: Deposit & Arrangement Phase",
                    "Khách thanh toán tiền cọc, hệ thống bắt đầu giai đoạn hòa âm (arrangement). Sau khi trả cọc → được assign task arrangement. Arranger làm, gửi bản arr, khách duyệt.",
                    MilestoneBillingType.PERCENTAGE, depositPercent,
                    totalPrice, MilestonePaymentStatus.DUE
                ));
                milestones.add(createMilestone(
                    contractId, 2,
                    "Milestone 2: Recording & Final Delivery",
                    "Thu âm, hoàn thiện bản phối, giao sản phẩm cuối cùng. Sau khi arrangement OK thì bắt đầu booking thu, thu âm, chỉnh sửa, mix nhẹ, gửi final.",
                    MilestoneBillingType.PERCENTAGE, finalPercent,
                    totalPrice, MilestonePaymentStatus.NOT_DUE
                ));
            }
            case arrangement -> {
                // Arrangement: 2 milestones (depositPercent, 100% - depositPercent)
                BigDecimal finalPercent = BigDecimal.valueOf(100).subtract(depositPercent);
                milestones.add(createMilestone(
                    contractId, 1,
                    "Milestone 1: Deposit & Start Arrangement",
                    "Khách thanh toán cọc, bắt đầu làm hòa âm",
                    MilestoneBillingType.PERCENTAGE, depositPercent,
                    totalPrice, MilestonePaymentStatus.DUE
                ));
                milestones.add(createMilestone(
                    contractId, 2,
                    "Milestone 2: Final Arrangement Delivery",
                    "Giao bản hòa âm hoàn chỉnh, khách xác nhận",
                    MilestoneBillingType.PERCENTAGE, finalPercent,
                    totalPrice, MilestonePaymentStatus.NOT_DUE
                ));
            }
            case recording -> {
                // Recording: 2 milestones (depositPercent, 100% - depositPercent)
                BigDecimal finalPercent = BigDecimal.valueOf(100).subtract(depositPercent);
                milestones.add(createMilestone(
                    contractId, 1,
                    "Milestone 1: Deposit & Start Recording",
                    "Khách thanh toán cọc, bắt đầu thu âm",
                    MilestoneBillingType.PERCENTAGE, depositPercent,
                    totalPrice, MilestonePaymentStatus.DUE
                ));
                milestones.add(createMilestone(
                    contractId, 2,
                    "Milestone 2: Final Recording Delivery",
                    "Giao file thu âm hoàn chỉnh, khách xác nhận",
                    MilestoneBillingType.PERCENTAGE, finalPercent,
                    totalPrice, MilestonePaymentStatus.NOT_DUE
                ));
            }
            case bundle -> {
                // Bundle (T+A+R): 3 milestones (depositPercent, chia đều phần còn lại)
                BigDecimal remainingPercent = BigDecimal.valueOf(100).subtract(depositPercent);
                BigDecimal milestone2Percent = remainingPercent.divide(BigDecimal.valueOf(2), 2, 
                    java.math.RoundingMode.HALF_UP);
                BigDecimal milestone3Percent = remainingPercent.subtract(milestone2Percent);
                
                milestones.add(createMilestone(
                    contractId, 1,
                    "Milestone 1: Deposit & Start Transcription",
                    "Khách thanh toán cọc, bắt đầu ký âm",
                    MilestoneBillingType.PERCENTAGE, depositPercent,
                    totalPrice, MilestonePaymentStatus.DUE
                ));
                milestones.add(createMilestone(
                    contractId, 2,
                    "Milestone 2: Arrangement Completed",
                    "Hoàn tất hòa âm, khách duyệt",
                    MilestoneBillingType.PERCENTAGE, milestone2Percent,
                    totalPrice, MilestonePaymentStatus.NOT_DUE
                ));
                milestones.add(createMilestone(
                    contractId, 3,
                    "Milestone 3: Recording & Final Delivery",
                    "Thu âm và giao file final, khách confirm",
                    MilestoneBillingType.PERCENTAGE, milestone3Percent,
                    totalPrice, MilestonePaymentStatus.NOT_DUE
                ));
            }
        }
        
        if (!milestones.isEmpty()) {
            contractMilestoneRepository.saveAll(milestones);
            log.info("Created {} milestones for contract: contractId={}, contractType={}, depositPercent={}%", 
                milestones.size(), contractId, contractType, depositPercent);
        }
    }
    
    /**
     * Helper method để tạo một milestone
     */
    private ContractMilestone createMilestone(
            String contractId, 
            Integer orderIndex,
            String name,
            String description,
            MilestoneBillingType billingType,
            BigDecimal billingValue,
            BigDecimal totalPrice,
            MilestonePaymentStatus paymentStatus) {
        
        // Tính số tiền thực tế của milestone
        BigDecimal amount;
        if (billingType == MilestoneBillingType.PERCENTAGE) {
            // Tính từ phần trăm: totalPrice * billingValue / 100
            amount = totalPrice.multiply(billingValue).divide(BigDecimal.valueOf(100), 2, 
                java.math.RoundingMode.HALF_UP);
        } else if (billingType == MilestoneBillingType.FIXED) {
            // Nếu FIXED thì amount = billingValue
            amount = billingValue;
        } else {
            // NO_PAYMENT
            amount = BigDecimal.ZERO;
        }
        
        return ContractMilestone.builder()
            .contractId(contractId)
            .orderIndex(orderIndex)
            .name(name)
            .description(description)
            .billingType(billingType)
            .billingValue(billingValue)
            .amount(amount)
            .paymentStatus(paymentStatus)
            .workStatus(MilestoneWorkStatus.PLANNED)
            .createdAt(Instant.now())
            .build();
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
            log.warn("userId claim not found in JWT, falling back to subject");
            return jwt.getSubject();
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
     */
    @SuppressWarnings("unchecked")
    private List<String> getCurrentUserRoles() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            Object rolesObject = jwt.getClaim("scope");
            if (rolesObject instanceof String rolesString) {
                return List.of(rolesString.split(" "));
            } else if (rolesObject instanceof List) {
                return (List<String>) rolesObject;
            }
            log.warn("roles/scope claim not found in JWT");
            return List.of();
        }
        throw UserNotAuthenticatedException.create();
    }

    /**
     * Get contract signature image as base64 data URL (to export contract PDF)
     * @param contractId ID của contract
     * @return Base64 data URL của signature image
     * @throws SignatureImageNotFoundException nếu signature image không tồn tại
     * @throws IllegalStateException nếu S3 service không available
     * @throws RuntimeException nếu có lỗi khi download từ S3
     */
    public String getSignatureImageBase64(String contractId) {
        ContractResponse contract = getContractById(contractId);
        
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
            throw new RuntimeException("Failed to retrieve signature image: " + e.getMessage(), e);
        }
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
            contract.getStatus() != ContractStatus.active) {
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
            contract.setUpdatedAt(Instant.now());
            contractRepository.save(contract);

            log.info("Contract PDF uploaded successfully: contractId={}, fileId={}, s3Url={}", 
                    contractId, savedFile.getFileId(), s3Url);

            return savedFile.getFileId();
        } catch (Exception e) {
            log.error("Error uploading contract PDF for contract {}: {}", contractId, e.getMessage(), e);
            throw new RuntimeException("Failed to upload contract PDF: " + e.getMessage(), e);
        }
    }
}

