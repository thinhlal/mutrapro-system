package com.mutrapro.request_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for request statistics grouped by date
 * Dùng cho Pipeline Flow chart trong Manager Dashboard
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestStatisticsByDateResponse {
    
    /**
     * List of daily request statistics
     */
    private List<DailyRequestStats> dailyStats;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyRequestStats {
        /**
         * Date (YYYY-MM-DD format)
         */
        private LocalDate date;
        
        /**
         * Number of requests with status 'pending' created on this date
         */
        private long pending;
        
        /**
         * Number of requests with status 'in_progress' created on this date
         */
        private long inProgress;
        
        /**
         * Number of requests with status 'completed' created on this date
         */
        private long completed;
    }
}

