package com.mutrapro.identity_service.repository.httpclient;

import com.mutrapro.identity_service.dto.response.AdminDashboardOverviewResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Feign client gọi billing-service để lấy thống kê ví cho admin dashboard.
 */
@FeignClient(
        name = "billing-service",
        url = "${billing.service.base-url:http://billing-service:8085}",
        path = "/admin/wallets"
)
public interface BillingDashboardClient {

    @GetMapping("/statistics")
    ApiResponse<AdminDashboardOverviewResponse.WalletStatsSummary> getWalletStatistics();
}


