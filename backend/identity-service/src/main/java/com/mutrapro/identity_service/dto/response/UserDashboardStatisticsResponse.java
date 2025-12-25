package com.mutrapro.identity_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response chứa tất cả user statistics (statistics và statistics over time)
 * Gộp lại để giảm số lượng API calls từ frontend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDashboardStatisticsResponse {
    private UserStatisticsResponse statistics;
    private UserStatisticsByDateResponse statisticsOverTime;
}

