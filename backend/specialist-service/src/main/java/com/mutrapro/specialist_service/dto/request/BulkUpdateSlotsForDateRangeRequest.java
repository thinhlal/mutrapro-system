package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.SlotStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Request DTO để bulk update slots cho nhiều ngày cùng lúc
 * Dùng cho tính năng "Mở slots cho 7 ngày"
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUpdateSlotsForDateRangeRequest {
    
    @NotNull(message = "Start date is required")
    private LocalDate startDate;
    
    @NotNull(message = "End date is required")
    private LocalDate endDate;
    
    /**
     * Danh sách startTime của các slots cần update
     * Ví dụ: [08:00, 10:00, 12:00]
     */
    @NotNull(message = "Start times are required")
    private List<LocalTime> startTimes;
    
    @NotNull(message = "Slot status is required")
    private SlotStatus slotStatus;
    
    /**
     * Có phải là recurring không (áp dụng cho tất cả slots)
     */
    @Builder.Default
    private Boolean isRecurring = false;
}

