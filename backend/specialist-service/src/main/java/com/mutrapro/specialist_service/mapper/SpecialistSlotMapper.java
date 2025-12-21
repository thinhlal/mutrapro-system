package com.mutrapro.specialist_service.mapper;

import com.mutrapro.specialist_service.dto.request.CreateSlotRequest;
import com.mutrapro.specialist_service.dto.response.DaySlotsResponse;
import com.mutrapro.specialist_service.dto.response.SlotResponse;
import com.mutrapro.specialist_service.entity.SpecialistSlot;
import com.mutrapro.specialist_service.enums.SlotStatus;
import com.mutrapro.specialist_service.util.SlotGridConstants;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class SpecialistSlotMapper {
    
    /**
     * Map CreateSlotRequest sang SpecialistSlot entity
     */
    public SpecialistSlot toSpecialistSlot(CreateSlotRequest request) {
        if (request == null) {
            return null;
        }
        
        SpecialistSlot.SpecialistSlotBuilder builder = SpecialistSlot.builder()
            .slotDate(request.getSlotDate())
            .startTime(request.getStartTime())
            .isRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : false)
            .slotStatus(request.getSlotStatus() != null ? request.getSlotStatus() : SlotStatus.UNAVAILABLE);
        
        // Nếu là recurring, tính dayOfWeek từ slotDate
        if (Boolean.TRUE.equals(request.getIsRecurring()) && request.getSlotDate() != null) {
            DayOfWeek dayOfWeek = request.getSlotDate().getDayOfWeek();
            builder.dayOfWeek(dayOfWeek.getValue()); // Monday=1, Sunday=7
        }
        
        return builder.build();
    }
    
    /**
     * Map SpecialistSlot entity sang SlotResponse
     */
    public SlotResponse toSlotResponse(SpecialistSlot slot) {
        if (slot == null) {
            return null;
        }
        
        return SlotResponse.builder()
            .slotId(slot.getSlotId())
            .specialistId(slot.getSpecialist() != null ? slot.getSpecialist().getSpecialistId() : null)
            .slotDate(slot.getSlotDate())
            .startTime(slot.getStartTime())
            .endTime(slot.getEndTime()) // Tính từ startTime + 2h
            .isRecurring(slot.getIsRecurring())
            .dayOfWeek(slot.getDayOfWeek())
            .slotStatus(slot.getSlotStatus())
            .createdAt(slot.getCreatedAt())
            .updatedAt(slot.getUpdatedAt())
            .build();
    }
    
    /**
     * Map list of SpecialistSlot sang list of SlotResponse
     */
    public List<SlotResponse> toSlotResponseList(List<SpecialistSlot> slots) {
        if (slots == null) {
            return List.of();
        }
        
        return slots.stream()
            .map(this::toSlotResponse)
            .collect(Collectors.toList());
    }
    
    /**
     * Tạo DaySlotsResponse cho một ngày
     * Tạo tất cả 5 slots (08:00, 10:00, 12:00, 14:00, 16:00)
     * Nếu slot chưa tồn tại trong DB, tạo slot với status UNAVAILABLE
     */
    public DaySlotsResponse toDaySlotsResponse(LocalDate date, List<SpecialistSlot> existingSlots) {
        List<SlotResponse> slots = SlotGridConstants.VALID_START_TIMES.stream()
            .map(startTime -> {
                // Tìm slot đã tồn tại
                SpecialistSlot existingSlot = existingSlots.stream()
                    .filter(s -> s.getStartTime().equals(startTime))
                    .findFirst()
                    .orElse(null);
                
                if (existingSlot != null) {
                    return toSlotResponse(existingSlot);
                } else {
                    // Tạo slot mới với status UNAVAILABLE (chưa đăng ký)
                    return SlotResponse.builder()
                        .slotId(null) // Chưa có trong DB
                        .slotDate(date)
                        .startTime(startTime)
                        .endTime(SlotGridConstants.getSlotEndTime(startTime))
                        .slotStatus(SlotStatus.UNAVAILABLE)
                        .isRecurring(false)
                        .dayOfWeek(null)
                        .build();
                }
            })
            .collect(Collectors.toList());
        
        return DaySlotsResponse.builder()
            .date(date)
            .slots(slots)
            .build();
    }
}

