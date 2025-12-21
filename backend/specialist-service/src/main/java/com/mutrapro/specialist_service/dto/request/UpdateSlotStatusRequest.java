package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.SlotStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để cập nhật status của slot
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSlotStatusRequest {
    
    @NotNull(message = "Slot status is required")
    private SlotStatus slotStatus;
}

