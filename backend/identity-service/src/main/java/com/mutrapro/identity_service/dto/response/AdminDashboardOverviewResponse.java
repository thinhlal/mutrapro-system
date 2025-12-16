package com.mutrapro.identity_service.dto.response;

import com.mutrapro.identity_service.service.UserSearchService;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Aggregated admin dashboard overview response.
 *
 * Hiện tại gồm:
 * - Thống kê user (identity-service)
 * - Thống kê ví & giao dịch (billing-service, map về DTO nội bộ)
 *
 * Có thể mở rộng thêm các block khác (request / contract / task) sau.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardOverviewResponse {

    /**
     * User-related statistics (from identity-service).
     */
    private UserSearchService.UserStatisticsResponse userStats;

    /**
     * Wallet and transaction statistics (from billing-service).
     */
    private WalletStatsSummary walletStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WalletStatsSummary {
        private long totalWallets;
        private BigDecimal totalBalance;
        private long totalTransactions;
        private Map<String, Long> transactionsByType;
    }
}



