package com.mutrapro.billing_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevenueStatisticsResponse {
    private RevenueMetrics total;
    private RevenueMetrics fromTopups;
    private RevenueMetrics fromServices;
    private List<DailyRevenue> dailyStats; // For sparkline

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueMetrics {
        private BigDecimal value;
        private Double trend; // Percentage change vs previous period
        private List<BigDecimal> sparkline; // Daily values for chart
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRevenue {
        private LocalDate date;
        private BigDecimal totalRevenue;
        private BigDecimal topupRevenue;
        private BigDecimal serviceRevenue;
    }
}

