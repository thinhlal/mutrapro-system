package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO cho slots của một ngày
 * Dùng cho giao diện calendar
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DaySlotsResponse {
    
    private LocalDate date;
    
    /**
     * Danh sách slots trong ngày (5 slots: 08:00, 10:00, 12:00, 14:00, 16:00)
     */
    private List<SlotResponse> slots;
}

