package com.mutrapro.identity_service.service;

import com.mutrapro.identity_service.dto.response.AdminDashboardOverviewResponse;
import com.mutrapro.identity_service.repository.httpclient.BillingDashboardClient;
import com.mutrapro.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

/**
 * Service tổng hợp dữ liệu cho Admin Dashboard.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UserSearchService userSearchService;
    private final BillingDashboardClient billingDashboardClient;

    /**
     * Lấy tổng quan dashboard cho SYSTEM_ADMIN.
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public AdminDashboardOverviewResponse getOverview() {
        log.info("Building admin dashboard overview");

        var userStats = userSearchService.getUserStatistics();

        AdminDashboardOverviewResponse.WalletStatsSummary walletStats = null;
        try {
            ApiResponse<AdminDashboardOverviewResponse.WalletStatsSummary> response =
                    billingDashboardClient.getWalletStatistics();
            if (response != null && response.getData() != null) {
                walletStats = response.getData();
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch wallet statistics from billing-service: {}", ex.getMessage());
        }

        return AdminDashboardOverviewResponse.builder()
                .userStats(userStats)
                .walletStats(walletStats)
                .build();
    }
}


