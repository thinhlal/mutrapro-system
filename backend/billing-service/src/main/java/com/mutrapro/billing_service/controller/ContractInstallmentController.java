package com.mutrapro.billing_service.controller;

import com.mutrapro.billing_service.dto.request.CreateInstallmentsRequest;
import com.mutrapro.billing_service.dto.response.ContractInstallmentResponse;
import com.mutrapro.billing_service.service.ContractInstallmentService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/contract-installments")
@RequiredArgsConstructor
@Tag(name = "Contract Installment", description = "Contract Installment Management API")
public class ContractInstallmentController {

    private final ContractInstallmentService installmentService;

    @PostMapping("/create-for-signed-contract")
    @Operation(summary = "Tạo installments (Deposit và Final) khi contract được ký")
    public ApiResponse<List<ContractInstallmentResponse>> createInstallmentsForSignedContract(
            @Valid @RequestBody CreateInstallmentsRequest request) {
        log.info("Creating installments for signed contract: contractId={}", request.getContractId());
        List<ContractInstallmentResponse> installments = 
            installmentService.createInstallmentsForSignedContract(request);
        return ApiResponse.<List<ContractInstallmentResponse>>builder()
                .message("Installments created successfully")
                .data(installments)
                .statusCode(HttpStatus.CREATED.value())
                .status("success")
                .build();
    }

    @GetMapping("/contract/{contractId}")
    @Operation(summary = "Lấy tất cả installments của một contract")
    public ApiResponse<List<ContractInstallmentResponse>> getInstallmentsByContractId(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId) {
        log.info("Getting installments for contract: contractId={}", contractId);
        List<ContractInstallmentResponse> installments = 
            installmentService.getInstallmentsByContractId(contractId);
        return ApiResponse.<List<ContractInstallmentResponse>>builder()
                .message("Installments retrieved successfully")
                .data(installments)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    @GetMapping("/contract/{contractId}/pending-deposit")
    @Operation(summary = "Lấy deposit installment đang pending của một contract")
    public ApiResponse<ContractInstallmentResponse> getPendingDepositInstallment(
            @Parameter(description = "ID của contract")
            @PathVariable String contractId) {
        log.info("Getting pending deposit installment for contract: contractId={}", contractId);
        ContractInstallmentResponse deposit = 
            installmentService.getPendingDepositInstallment(contractId);
        return ApiResponse.<ContractInstallmentResponse>builder()
                .message("Pending deposit installment retrieved successfully")
                .data(deposit)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }
}

