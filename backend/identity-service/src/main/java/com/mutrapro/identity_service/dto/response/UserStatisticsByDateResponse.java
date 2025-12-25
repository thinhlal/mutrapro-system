package com.mutrapro.identity_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for user statistics grouped by date
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserStatisticsByDateResponse {
    
    /**
     * List of daily user statistics
     */
    private List<DailyUserStats> dailyStats;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyUserStats {
        /**
         * Date (YYYY-MM-DD format)
         */
        private LocalDate date;
        
        /**
         * Number of new users registered on this date
         */
        private long count;
    }
}

