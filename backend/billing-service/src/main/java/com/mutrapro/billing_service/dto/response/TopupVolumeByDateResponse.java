package com.mutrapro.billing_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for topup volume statistics grouped by date
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopupVolumeByDateResponse {
    
    /**
     * List of daily topup volume statistics
     */
    private List<DailyTopupVolume> dailyStats;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyTopupVolume {
        /**
         * Date (YYYY-MM-DD format)
         */
        private LocalDate date;
        
        /**
         * Total topup amount on this date (in VND or wallet currency)
         */
        private BigDecimal amount;
    }
}

