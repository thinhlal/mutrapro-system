package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CreateContractRequest;
import com.mutrapro.project_service.dto.response.ContractResponse;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.service.ContractService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/contracts")
@RequiredArgsConstructor
@Tag(name = "Contract", description = "Contract Management API")
public class ContractController {

    private final ContractService contractService;

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
    public ApiResponse<List<ContractResponse>> getMyManagedContracts() {
        log.info("Getting my managed contracts");
        List<ContractResponse> contracts = contractService.getMyManagedContracts();
        return ApiResponse.<List<ContractResponse>>builder()
                .message("Contracts retrieved successfully")
                .data(contracts)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @PutMapping("/{contractId}/status")
    @Operation(summary = "Update contract status (sent, reviewed, signed, expired)")
    public ApiResponse<ContractResponse> updateContractStatus(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId,
            @Parameter(description = "Status mới (sent, reviewed, signed, expired)")
            @RequestParam ContractStatus status,
            @Parameter(description = "Số ngày để expires (chỉ áp dụng khi status = sent, mặc định 7 ngày)")
            @RequestParam(required = false) Integer expiresInDays) {
        log.info("Updating contract status: contractId={}, status={}, expiresInDays={}", 
            contractId, status, expiresInDays);
        ContractResponse contract = contractService.updateContractStatus(contractId, status, expiresInDays);
        return ApiResponse.<ContractResponse>builder()
                .message("Contract status updated successfully")
                .data(contract)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }
}

