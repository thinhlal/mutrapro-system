package com.mutrapro.billing_service.client;

import com.mutrapro.billing_service.dto.response.MilestonePaymentQuoteResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Feign Client to call project-service for authoritative payment quotes.
 */
@FeignClient(
    name = "project-service",
    url = "${project.service.base-url:http://project-service:8082}",
    path = ""
)
public interface ProjectServiceFeignClient {

    @GetMapping("/contracts/{contractId}/milestones/{milestoneId}/payment-quote")
    ApiResponse<MilestonePaymentQuoteResponse> getMilestonePaymentQuote(
        @PathVariable("contractId") String contractId,
        @PathVariable("milestoneId") String milestoneId
    );
}



