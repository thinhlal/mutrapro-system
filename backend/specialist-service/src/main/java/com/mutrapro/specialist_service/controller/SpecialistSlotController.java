package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.request.BulkUpdateSlotsRequest;
import com.mutrapro.specialist_service.dto.request.BulkUpdateSlotsForDateRangeRequest;
import com.mutrapro.specialist_service.dto.request.CreateSlotRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSlotStatusRequest;
import com.mutrapro.specialist_service.dto.response.DaySlotsResponse;
import com.mutrapro.specialist_service.dto.response.SlotResponse;
import com.mutrapro.specialist_service.service.SpecialistSlotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller cho Specialist quản lý work slots
 * Chỉ Recording Artist mới được phép sử dụng
 */
@Slf4j
@RestController
@RequestMapping("/specialists/me/slots")
@RequiredArgsConstructor
public class SpecialistSlotController {
    
    private final SpecialistSlotService slotService;
    
    /**
     * Lấy slots của một ngày (cho giao diện calendar)
     * GET /specialists/me/slots/day?date=2024-01-01
     * Trả về tất cả 5 slots (08:00, 10:00, 12:00, 14:00, 16:00)
     */
    @GetMapping("/day")
    public ApiResponse<DaySlotsResponse> getDaySlots(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        log.info("GET /specialists/me/slots/day?date={} - Getting day slots", date);
        DaySlotsResponse daySlots = slotService.getDaySlots(date);
        return ApiResponse.<DaySlotsResponse>builder()
            .message("Day slots retrieved successfully")
            .data(daySlots)
            .build();
    }
    
    /**
     * Lấy slots trong một khoảng thời gian (cho calendar view)
     * GET /specialists/me/slots?startDate=2024-01-01&endDate=2024-01-31
     */
    @GetMapping
    public ApiResponse<List<DaySlotsResponse>> getSlotsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        log.info("GET /specialists/me/slots?startDate={}&endDate={} - Getting slots by date range", 
            startDate, endDate);
        List<DaySlotsResponse> slots = slotService.getSlotsByDateRange(startDate, endDate);
        return ApiResponse.<List<DaySlotsResponse>>builder()
            .message("Slots retrieved successfully")
            .data(slots)
            .build();
    }
    
    /**
     * Tạo hoặc update slot
     * POST /specialists/me/slots
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SlotResponse> createOrUpdateSlot(@Valid @RequestBody CreateSlotRequest request) {
        log.info("POST /specialists/me/slots - Creating or updating slot");
        SlotResponse slot = slotService.createOrUpdateSlot(request);
        return ApiResponse.<SlotResponse>builder()
            .message("Slot created or updated successfully")
            .data(slot)
            .statusCode(201)
            .build();
    }
    
    /**
     * Update status của một slot
     * PUT /specialists/me/slots/{slotId}/status
     */
    @PutMapping("/{slotId}/status")
    public ApiResponse<SlotResponse> updateSlotStatus(
            @PathVariable String slotId,
            @Valid @RequestBody UpdateSlotStatusRequest request) {
        log.info("PUT /specialists/me/slots/{}/status - Updating slot status", slotId);
        SlotResponse slot = slotService.updateSlotStatus(slotId, request);
        return ApiResponse.<SlotResponse>builder()
            .message("Slot status updated successfully")
            .data(slot)
            .build();
    }
    
    /**
     * Bulk update nhiều slots cùng lúc (cho giao diện calendar)
     * PUT /specialists/me/slots/bulk
     */
    @PutMapping("/bulk")
    public ApiResponse<List<SlotResponse>> bulkUpdateSlots(@Valid @RequestBody BulkUpdateSlotsRequest request) {
        log.info("PUT /specialists/me/slots/bulk - Bulk updating slots");
        List<SlotResponse> slots = slotService.bulkUpdateSlots(request);
        return ApiResponse.<List<SlotResponse>>builder()
            .message("Slots updated successfully")
            .data(slots)
            .build();
    }
    
    /**
     * Bulk update slots cho nhiều ngày cùng lúc (tối ưu cho "Mở slots cho 7 ngày")
     * PUT /specialists/me/slots/bulk/date-range
     */
    @PutMapping("/bulk/date-range")
    public ApiResponse<List<SlotResponse>> bulkUpdateSlotsForDateRange(
            @Valid @RequestBody BulkUpdateSlotsForDateRangeRequest request) {
        log.info("PUT /specialists/me/slots/bulk/date-range - Bulk updating slots for date range");
        List<SlotResponse> slots = slotService.bulkUpdateSlotsForDateRange(request);
        return ApiResponse.<List<SlotResponse>>builder()
            .message("Slots updated successfully")
            .data(slots)
            .build();
    }
    
    /**
     * Xóa slot (chỉ xóa nếu status = UNAVAILABLE)
     * DELETE /specialists/me/slots/{slotId}
     */
    @DeleteMapping("/{slotId}")
    public ApiResponse<Void> deleteSlot(@PathVariable String slotId) {
        log.info("DELETE /specialists/me/slots/{} - Deleting slot", slotId);
        slotService.deleteSlot(slotId);
        return ApiResponse.<Void>builder()
            .message("Slot deleted successfully")
            .build();
    }
}

