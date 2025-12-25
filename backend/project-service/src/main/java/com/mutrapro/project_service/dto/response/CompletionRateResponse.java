package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class CompletionRateResponse {
    
    List<DailyCompletionRate> dailyRates;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = PRIVATE)
    public static class DailyCompletionRate {
        LocalDate date;
        Double rate; // Percentage (0-100), null if no completed tasks on that day
        Long totalCompleted;
        Long onTimeCompleted;
    }
}

