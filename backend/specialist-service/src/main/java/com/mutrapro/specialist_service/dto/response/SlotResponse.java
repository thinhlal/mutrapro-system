package com.mutrapro.specialist_service.dto.response;

import com.mutrapro.specialist_service.enums.SlotStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Response DTO cho slot
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotResponse {
    
    private String slotId;
    
    private String specialistId;
    
    private LocalDate slotDate;
    
    private LocalTime startTime;
    
    private LocalTime endTime; // startTime + 2h
    
    private Boolean isRecurring;
    
    private Integer dayOfWeek; // 1=Monday, 2=Tuesday, ..., 7=Sunday
    
    private SlotStatus slotStatus;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}

