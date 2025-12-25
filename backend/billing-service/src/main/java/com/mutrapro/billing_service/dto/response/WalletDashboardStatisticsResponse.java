package com.mutrapro.billing_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response chứa tất cả wallet statistics (statistics, topup volume, và revenue statistics)
 * Gộp lại để giảm số lượng API calls từ frontend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletDashboardStatisticsResponse {
    private WalletStatisticsResponse statistics;
    private TopupVolumeByDateResponse topupVolume;
    private RevenueStatisticsResponse revenueStatistics;
}

