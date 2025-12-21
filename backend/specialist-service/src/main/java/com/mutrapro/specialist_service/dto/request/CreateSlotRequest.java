package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.SlotStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request DTO để tạo slot mới
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSlotRequest {
    
    @NotNull(message = "Slot date is required")
    private LocalDate slotDate;
    
    @NotNull(message = "Start time is required")
    private LocalTime startTime;
    
    /**
     * Có phải là recurring slot không
     * Nếu true, slot sẽ lặp lại mỗi tuần vào cùng day of week
     */
    @Builder.Default
    private Boolean isRecurring = false;
    
    /**
     * Trạng thái của slot
     * Mặc định: UNAVAILABLE (chưa mở)
     */
    @Builder.Default
    private SlotStatus slotStatus = SlotStatus.UNAVAILABLE;
}

