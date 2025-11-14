package com.mutrapro.project_service.client;

import com.mutrapro.project_service.dto.request.CreateInstallmentsRequest;
import com.mutrapro.project_service.dto.response.ContractInstallmentResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

/**
 * Feign Client to call Billing Service
 */
@FeignClient(
    name = "billing-service",
    url = "${billing.service.base-url}"
)
public interface BillingServiceFeignClient {
    
    /**
     * Tạo installments (Deposit và Final) khi contract được ký
     */
    @PostMapping("/contract-installments/create-for-signed-contract")
    ApiResponse<List<ContractInstallmentResponse>> createInstallmentsForSignedContract(
        @RequestBody CreateInstallmentsRequest request);
    
    /**
     * Lấy deposit installment đang pending của một contract
     */
    @GetMapping("/contract-installments/contract/{contractId}/pending-deposit")
    ApiResponse<ContractInstallmentResponse> getPendingDepositInstallment(
        @PathVariable("contractId") String contractId);
}

