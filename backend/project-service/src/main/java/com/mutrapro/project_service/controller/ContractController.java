package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.request.UpdateContractRequest;
import com.mutrapro.project_service.dto.request.CustomerActionRequest;
import com.mutrapro.project_service.dto.request.InitESignRequest;
import com.mutrapro.project_service.dto.request.VerifyOTPRequest;
import com.mutrapro.project_service.dto.request.StartContractWorkRequest;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.dto.response.ContractMilestoneResponse;
import com.mutrapro.project_service.dto.response.ESignInitResponse;
import com.mutrapro.project_service.dto.response.RequestContractInfo;
import com.mutrapro.project_service.service.ContractService;
import com.mutrapro.project_service.service.ESignService;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.CurrencyType;
import jakarta.validation.Valid;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
@Tag(name = "Contract", description = "Contract Management API")
public class ContractController {

    private final ContractService contractService;
    private final ESignService eSignService;

    @PostMapping("/from-request/{requestId}")
    @Operation(summary = "Tạo contract từ service request")
    public ApiResponse<ContractResponse> createContractFromServiceRequest(
            @Parameter(description = "ID của service request")
            @PathVariable String requestId,
            @RequestBody CreateContractRequest createRequest) {
        log.info("Creating contract from service request: requestId={}", requestId);
        ContractResponse contract = contractService.createContractFromServiceRequest(requestId, createRequest);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract created successfully")
                .data(contract)
                .statusCode(HttpStatus.CREATED.value())
                .status("success")
                .build();
    }

    @GetMapping("/{contractId}")
    @Operation(summary = "Lấy chi tiết contract theo ID")
    public ApiResponse<ContractResponse> getContractById(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId) {
        log.info("Getting contract by id: contractId={}", contractId);
        ContractResponse contract = contractService.getContractById(contractId);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract retrieved successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PutMapping("/{contractId}")
    @Operation(summary = "Cập nhật contract (chỉ cho DRAFT contracts)")
    public ApiResponse<ContractResponse> updateContract(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @RequestBody UpdateContractRequest updateRequest) {
        log.info("Updating contract: contractId={}", contractId);
        ContractResponse contract = contractService.updateContract(contractId, updateRequest);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract updated successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/by-request/{requestId}")
    @Operation(summary = "Lấy danh sách contracts theo requestId")
    public ApiResponse<List<ContractResponse>> getContractsByRequestId(
            @Parameter(description = "ID của service request")
            @PathVariable String requestId) {
        log.info("Getting contracts by requestId: requestId={}", requestId);
        List<ContractResponse> contracts = contractService.getContractsByRequestId(requestId);
        return ApiResponse.<List<ContractResponse>>builder()
                .message("Contracts retrieved successfully")
                .data(contracts)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{contractId}/milestones/{milestoneId}")
    @Operation(summary = "Lấy thông tin milestone theo milestoneId và contractId")
    public ApiResponse<ContractMilestoneResponse> getMilestoneById(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Parameter(description = "ID của milestone")
            @PathVariable String milestoneId) {
        log.info("Getting milestone: contractId={}, milestoneId={}", contractId, milestoneId);
        ContractMilestoneResponse milestone = contractService.getMilestoneById(contractId, milestoneId);
        return ApiResponse.<ContractMilestoneResponse>builder()
                .message("Milestone retrieved successfully")
                .data(milestone)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/by-request-ids")
    @Operation(summary = "Lấy thông tin contract cho nhiều requestIds (batch)")
    public ApiResponse<Map<String, RequestContractInfo>> getContractInfoByRequestIds(
            @Parameter(description = "Danh sách request IDs")
            @RequestBody List<String> requestIds) {
        log.info("Getting contract info for {} requestIds", requestIds != null ? requestIds.size() : 0);
        Map<String, RequestContractInfo> contractInfo = contractService.getContractInfoByRequestIds(requestIds);
        return ApiResponse.<Map<String, RequestContractInfo>>builder()
                .message("Contract info retrieved successfully")
                .data(contractInfo)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/my-contracts")
    @Operation(summary = "Lấy danh sách contracts của user hiện tại")
    public ApiResponse<List<ContractResponse>> getMyContracts() {
        log.info("Getting my contracts");
        List<ContractResponse> contracts = contractService.getMyContracts();
        return ApiResponse.<List<ContractResponse>>builder()
                .message("Contracts retrieved successfully")
                .data(contracts)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/my-managed-contracts")
    @Operation(summary = "Lấy danh sách contracts được quản lý bởi manager hiện tại")
    public ApiResponse<List<ContractResponse>> getMyManagedContracts(
            @Parameter(description = "Search by contract number or customer name")
            @RequestParam(required = false) String search,
            @Parameter(description = "Filter by contract type")
            @RequestParam(required = false) ContractType contractType,
            @Parameter(description = "Filter by status")
            @RequestParam(required = false) ContractStatus status,
            @Parameter(description = "Filter by currency")
            @RequestParam(required = false) CurrencyType currency,
            @Parameter(description = "Start date for date range filter (ISO format)")
            @RequestParam(required = false) LocalDateTime startDate,
            @Parameter(description = "End date for date range filter (ISO format)")
            @RequestParam(required = false) LocalDateTime endDate) {
        log.info("Getting my managed contracts with filters: search={}, contractType={}, status={}, currency={}, startDate={}, endDate={}", 
                search, contractType, status, currency, startDate, endDate);
        
        // Nếu có filter thì dùng method có filter, không thì dùng method cũ
        List<ContractResponse> contracts;
        if (search != null || contractType != null || status != null || currency != null || startDate != null || endDate != null) {
            contracts = contractService.getMyManagedContractsWithFilters(
                    search, contractType, status, currency, startDate, endDate);
        } else {
            contracts = contractService.getMyManagedContracts();
        }
        
        return ApiResponse.<List<ContractResponse>>builder()
                .message("Contracts retrieved successfully")
                .data(contracts)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{contractId}/send")
    @Operation(summary = "Manager gửi contract cho customer (chỉ cho phép khi status = DRAFT)")
    public ApiResponse<ContractResponse> sendContractToCustomer(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Parameter(description = "Số ngày hết hạn (mặc định 7 ngày)")
            @RequestParam(required = false) Integer expiresInDays) {
        log.info("Manager sending contract to customer: contractId={}, expiresInDays={}", 
            contractId, expiresInDays);
        ContractResponse contract = contractService.sendContractToCustomer(contractId, expiresInDays);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract sent to customer successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{contractId}/approve")
    @Operation(summary = "Customer approve contract (chỉ cho phép khi status = SENT)")
    public ApiResponse<ContractResponse> approveContract(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId) {
        log.info("Customer approving contract: contractId={}", contractId);
        ContractResponse contract = contractService.approveContract(contractId);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract approved successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{contractId}/start-work")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    @Operation(summary = "Manager start contract work sau khi đã assign tasks (status phải là ACTIVE_PENDING_ASSIGNMENT)")
    public ApiResponse<ContractResponse> startContractWork(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @RequestBody(required = false) StartContractWorkRequest request) {
        log.info("Manager starting contract work: contractId={}", contractId);
        ContractResponse contract = contractService.startContractWork(
            contractId,
            request != null ? request.getStartAt() : null
        );
        return ApiResponse.<ContractResponse>builder()
                .message("Contract work started successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }


    @PostMapping("/{contractId}/request-change")
    @Operation(summary = "Customer request change contract (chỉ cho phép khi status = SENT)")
    public ApiResponse<ContractResponse> requestChangeContract(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Valid @RequestBody CustomerActionRequest request) {
        log.info("Customer requesting change for contract: contractId={}, reason={}", 
            contractId, request.getReason());
        ContractResponse contract = contractService.requestChangeContract(contractId, request);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract change requested successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{contractId}/cancel")
    @Operation(summary = "Customer cancel contract (chỉ cho phép khi status = SENT, không cho phép khi đã APPROVED hoặc đã có thanh toán)")
    public ApiResponse<ContractResponse> cancelContract(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Valid @RequestBody CustomerActionRequest request) {
        log.info("Customer canceling contract: contractId={}, reason={}", 
            contractId, request.getReason());
        ContractResponse contract = contractService.cancelContract(contractId, request);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract canceled successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{contractId}/cancel-by-manager")
    @Operation(summary = "Manager cancel contract (cho phép khi DRAFT hoặc SENT, không cho phép khi đã APPROVED/SIGNED. Khi SENT sẽ thông báo cho customer)")
    public ApiResponse<ContractResponse> cancelContractByManager(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Valid @RequestBody CustomerActionRequest request) {
        log.info("Manager canceling contract: contractId={}, reason={}", 
            contractId, request.getReason());
        ContractResponse contract = contractService.cancelContractByManager(contractId, request);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract canceled by manager successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    // E-Signature Endpoints
    
    @PostMapping("/{contractId}/init-esign")
    @Operation(summary = "Initialize e-signature process: save signature temporarily and send OTP")
    public ApiResponse<ESignInitResponse> initESign(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Valid @RequestBody InitESignRequest request) {
        log.info("Initializing e-signature for contract: contractId={}", contractId);
        ESignInitResponse response = eSignService.initESign(contractId, request);
        return ApiResponse.<ESignInitResponse>builder()
                .message("OTP sent successfully")
                .data(response)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping("/{contractId}/verify-otp")
    @Operation(summary = "Verify OTP and complete e-signature")
    public ApiResponse<ContractResponse> verifyOTPAndSign(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Valid @RequestBody VerifyOTPRequest request) {
        log.info("Verifying OTP and signing contract: contractId={}, sessionId={}", 
            contractId, request.getSessionId());
        eSignService.verifyOTPAndSign(contractId, request);
        
        // Get updated contract
        ContractResponse contract = contractService.getContractById(contractId);
        
        return ApiResponse.<ContractResponse>builder()
                .message("Contract signed successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/{contractId}/signature-image")
    @Operation(summary = "Get contract signature image as base64 (for export contract PDF)")
    public ApiResponse<String> getSignatureImage(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId) {
        log.info("Getting signature image for contract: contractId={}", contractId);
        String dataUrl = contractService.getSignatureImageBase64(contractId);
        return ApiResponse.<String>builder()
                .message("Signature image retrieved successfully")
                .data(dataUrl)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PostMapping(value = "/{contractId}/upload-pdf", consumes = {"multipart/form-data"})
    @Operation(summary = "Upload signed contract PDF file and link with contract after signed")
    public ApiResponse<String> uploadContractPdf(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Parameter(description = "PDF file của signed contract")
            @RequestParam("file") MultipartFile file) {
        log.info("Uploading contract PDF: contractId={}, fileName={}, size={}", 
                contractId, file.getOriginalFilename(), file.getSize());
        
        // Validate file type
        if (!file.getContentType().equals("application/pdf")) {
            return ApiResponse.<String>builder()
                    .message("Invalid file type. Only PDF files are allowed")
                    .statusCode(HttpStatus.BAD_REQUEST.value())
                    .status("error")
                    .build();
        }
        
        try {
            String fileId = contractService.uploadContractPdf(
                    contractId,
                    file.getInputStream(),
                    file.getOriginalFilename(),
                    file.getSize()
            );
            
            return ApiResponse.<String>builder()
                    .message("Contract PDF uploaded successfully")
                    .data(fileId)
                    .statusCode(HttpStatus.OK.value())
                    .status("success")
                    .build();
        } catch (IOException e) {
            log.error("Error reading PDF file: {}", e.getMessage(), e);
            return ApiResponse.<String>builder()
                    .message("Failed to read PDF file: " + e.getMessage())
                    .statusCode(HttpStatus.INTERNAL_SERVER_ERROR.value())
                    .status("error")
                    .build();
        }
    }
}

