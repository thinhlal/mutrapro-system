package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import com.mutrapro.project_service.exception.ContractAlreadyExistsException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
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
        
        // Kiểm tra xem đã có contract cho request này chưa
        if (contractRepository.existsByRequestId(requestId)) {
            throw ContractAlreadyExistsException.forRequest(requestId);
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
     * Lấy contract theo ID
     */
    public ContractResponse getContractById(UUID contractId) {
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId.toString()));
        return contractMapper.toResponse(contract);
    }
    
    /**
     * Lấy danh sách contracts theo requestId
     */
    public List<ContractResponse> getContractsByRequestId(String requestId) {
        List<Contract> contracts = contractRepository.findByRequestId(requestId);
        return contracts.stream()
            .map(contractMapper::toResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy danh sách contracts của user hiện tại
     */
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

