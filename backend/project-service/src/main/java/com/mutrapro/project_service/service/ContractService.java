package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.ChatServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.request.SendSystemMessageRequest;
import com.mutrapro.project_service.dto.response.ChatRoomResponse;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import com.mutrapro.project_service.exception.ContractAlreadyExistsException;
import com.mutrapro.project_service.dto.request.CustomerActionRequest;
import com.mutrapro.project_service.exception.ContractAlreadySignedException;
import com.mutrapro.project_service.exception.ContractExpiredException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.exception.InvalidRequestIdException;
import com.mutrapro.project_service.exception.ServiceRequestNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.UserNotAuthenticatedException;
import com.mutrapro.project_service.mapper.ContractMapper;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.shared.dto.ApiResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ContractService {

    ContractRepository contractRepository;
    ContractMapper contractMapper;
    RequestServiceFeignClient requestServiceFeignClient;
    ChatServiceFeignClient chatServiceFeignClient;

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
                        || status == ContractStatus.signed;
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
        
        // Tính due date nếu auto_due_date = true
        Instant expectedStartDate = Instant.now();
        
        Instant dueDate = null;
        if (createRequest.getAutoDueDate()) {
            dueDate = expectedStartDate.plusSeconds(slaDays * 24L * 60 * 60);
        }
        
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
        
        return contractMapper.toResponse(saved);
    }
    
    /**
     * Check và update expired contracts
     * Contracts đã hết hạn (expiresAt <= now) nhưng chưa signed sẽ được set status = expired
     */
    @Transactional
    public int checkAndUpdateExpiredContracts() {
        Instant now = Instant.now();
        List<Contract> expiredContracts = contractRepository.findExpiredContracts(now);
        
        if (expiredContracts.isEmpty()) {
            log.debug("No expired contracts found");
            return 0;
        }
        
        int updatedCount = 0;
        for (Contract contract : expiredContracts) {
            // Chỉ update nếu contract chưa được signed
            if (contract.getSignedAt() == null && contract.getStatus() != ContractStatus.signed) {
                contract.setStatus(ContractStatus.expired);
                contractRepository.save(contract);
                updatedCount++;
                log.info("Contract expired: contractId={}, contractNumber={}, expiresAt={}", 
                    contract.getContractId(), contract.getContractNumber(), contract.getExpiresAt());
            }
        }
        
        log.info("Updated {} expired contracts", updatedCount);
        return updatedCount;
    }
    
    /**
     * Lấy contract theo ID
     */
    @Transactional(readOnly = true)
    public ContractResponse getContractById(String contractId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        return contractMapper.toResponse(contract);
    }
    
    /**
     * Lấy danh sách contracts theo requestId
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> getContractsByRequestId(String requestId) {
        List<Contract> contracts = contractRepository.findByRequestId(requestId);
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
     * Update contract status
     * Khi status được set thành "sent", tự động set expiresAt (7 ngày sau khi sent)
     * Khi status được set thành "signed", check xem contract có hết hạn chưa
     * @param contractId ID của contract
     * @param newStatus Status mới
     * @param expiresInDays Số ngày để expires (mặc định 7 ngày, chỉ áp dụng khi status = sent)
     * @return ContractResponse
     */
    @Transactional
    public ContractResponse updateContractStatus(String contractId, ContractStatus newStatus, Integer expiresInDays) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Validate status transition
        ContractStatus currentStatus = contract.getStatus();
        
        // Không cho phép update status nếu contract đã bị cancel hoặc reject
        if (currentStatus == ContractStatus.canceled_by_customer 
            || currentStatus == ContractStatus.canceled_by_manager
            || currentStatus == ContractStatus.rejected_by_customer) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId, currentStatus, 
                "Không thể cập nhật status của contract đã bị hủy hoặc từ chối");
        }
        
        // Nếu đang update thành "sent"
        if (newStatus == ContractStatus.sent) {
            contract.setStatus(ContractStatus.sent);
            contract.setSentToCustomerAt(Instant.now());
            
            // Tự động set expiresAt nếu chưa có (mặc định 7 ngày sau khi sent)
            // Nếu đã có expiresAt từ khi tạo, giữ nguyên
            // Nếu expiresInDays được chỉ định, update lại expiresAt
            if (expiresInDays != null) {
                // Nếu có expiresInDays, update lại expiresAt
                contract.setExpiresAt(Instant.now().plusSeconds(expiresInDays * 24L * 60 * 60));
                log.info("Set expiresAt for contract: contractId={}, expiresAt={}, expiresInDays={}", 
                    contractId, contract.getExpiresAt(), expiresInDays);
            } else if (contract.getExpiresAt() == null) {
                // Nếu chưa có expiresAt, set mặc định 7 ngày
                int days = 7; // Mặc định 7 ngày
                contract.setExpiresAt(Instant.now().plusSeconds(days * 24L * 60 * 60));
                log.info("Set expiresAt for contract (default): contractId={}, expiresAt={}, expiresInDays={}", 
                    contractId, contract.getExpiresAt(), days);
            } else {
                // Nếu đã có expiresAt, giữ nguyên
                log.info("Contract already has expiresAt: contractId={}, expiresAt={}", 
                    contractId, contract.getExpiresAt());
            }
            
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
        }
        // Nếu đang update thành "signed"
        else if (newStatus == ContractStatus.signed) {
            // Check xem contract có hết hạn chưa
            if (contract.getExpiresAt() != null && contract.getExpiresAt().isBefore(Instant.now())) {
                throw ContractExpiredException.cannotSign(contract.getContractId(), contract.getExpiresAt());
            }
            
            contract.setStatus(ContractStatus.signed);
            contract.setSignedAt(Instant.now());
            
            // Nếu chưa có customerReviewedAt, set nó
            if (contract.getCustomerReviewedAt() == null) {
                contract.setCustomerReviewedAt(Instant.now());
            }
        }
        // Nếu đang update thành "expired"
        else if (newStatus == ContractStatus.expired) {
            // Chỉ cho phép set expired nếu chưa signed
            if (contract.getStatus() == ContractStatus.signed || contract.getSignedAt() != null) {
                throw ContractAlreadySignedException.cannotExpire(contract.getContractId());
            }
            contract.setStatus(ContractStatus.expired);
        }
        // Các status khác (draft)
        else {
            contract.setStatus(newStatus);
        }
        
        Contract saved = contractRepository.save(contract);
        log.info("Updated contract status: contractId={}, from={}, to={}", 
            contractId, currentStatus, newStatus);
        
        return contractMapper.toResponse(saved);
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
        
        // Update status
        contract.setStatus(ContractStatus.approved);
        contract.setCustomerReviewedAt(Instant.now());
        contract.setSignedAt(Instant.now());
        
        Contract saved = contractRepository.save(contract);
        log.info("Customer approved contract: contractId={}, userId={}", contractId, currentUserId);
        
        // Cập nhật request status thành "contract_signed" hoặc "approved"
        try {
            // Nếu contract đã được signed, update request status thành "contract_signed"
            // Nếu không, update thành "approved"
            String requestStatus = "contract_signed"; // Mặc định là contract_signed khi customer approve
            requestServiceFeignClient.updateRequestStatus(contract.getRequestId(), requestStatus);
            log.info("Updated request status to {}: requestId={}, contractId={}", 
                requestStatus, contract.getRequestId(), contractId);
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to update request status: requestId={}, contractId={}, error={}", 
                contract.getRequestId(), contractId, e.getMessage(), e);
        }
        
        return contractMapper.toResponse(saved);
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
        
        return contractMapper.toResponse(saved);
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
        // Không cho phép hủy khi đã APPROVED, SIGNED hoặc đã bắt đầu thực hiện
        if (contract.getStatus() != ContractStatus.sent) {
            if (contract.getStatus() == ContractStatus.approved || 
                contract.getStatus() == ContractStatus.signed) {
                throw InvalidContractStatusException.cannotCancel(
                    contractId, contract.getStatus(),
                    "Contract đã được approve hoặc đã ký. Không thể hủy trực tiếp. Vui lòng liên hệ support để yêu cầu hủy hợp đồng.");
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
        
        // TODO: Gửi notification cho manager
        // sendNotificationToManager(contract, request.getReason());
        
        return contractMapper.toResponse(saved);
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
        
        // Kiểm tra status: không cho phép hủy khi đã APPROVED hoặc SIGNED
        // Cho phép hủy khi DRAFT hoặc SENT
        if (contract.getStatus() == ContractStatus.approved || 
            contract.getStatus() == ContractStatus.signed) {
            throw InvalidContractStatusException.cannotCancel(
                contractId, contract.getStatus(),
                "Contract đã được approve hoặc đã ký. Không thể hủy. Vui lòng liên hệ support để xử lý.");
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
        
        // Nếu contract đã được gửi cho customer, gửi message vào chat room và notification
        if (wasSent) {
            try {
                // 1. Tìm chat room theo requestId
                ApiResponse<ChatRoomResponse> roomResponse = 
                    chatServiceFeignClient.getChatRoomByRequestId("REQUEST_CHAT", contract.getRequestId());
                
                if (roomResponse != null && "success".equals(roomResponse.getStatus()) 
                    && roomResponse.getData() != null) {
                    ChatRoomResponse roomData = roomResponse.getData();
                    String roomId = roomData.getRoomId();
                    
                    if (roomId != null && !roomId.isBlank()) {
                        // 2. Gửi system message vào chat room
                        String messageContent = String.format(
                            "Manager đã thu hồi/huỷ contract #%s vì: %s",
                            contract.getContractNumber(),
                            request.getReason()
                        );
                        
                        SendSystemMessageRequest messageRequest = SendSystemMessageRequest.builder()
                            .roomId(roomId)
                            .messageType("SYSTEM")  // System message
                            .content(messageContent)
                            .build();
                        
                        chatServiceFeignClient.sendSystemMessage(messageRequest);
                        log.info("Sent cancellation system message to chat room: roomId={}, contractId={}", 
                            roomId, contractId);
                    } else {
                        log.warn("Chat room found but roomId is null: requestId={}", contract.getRequestId());
                    }
                } else {
                    log.warn("Chat room not found for request: requestId={}", contract.getRequestId());
                }
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to send message to chat room for contract cancellation: contractId={}, error={}", 
                    contractId, e.getMessage(), e);
            }
            
            // TODO: Gửi notification cho customer về việc manager hủy contract
            // sendNotificationToCustomer(contract, request.getReason(), "Manager đã hủy contract");
            log.info("Contract was SENT to customer before cancellation. Notification sent: contractId={}, customerId={}", 
                contractId, contract.getUserId());
        }
        
        return contractMapper.toResponse(saved);
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
}

