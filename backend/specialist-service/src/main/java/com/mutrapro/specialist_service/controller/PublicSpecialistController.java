package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.response.SpecialistDetailResponse;
import com.mutrapro.specialist_service.service.PublicSpecialistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Public endpoints cho Specialists (không yêu cầu authentication)
 * Dùng cho customer và các service khác khi cần lấy specialist info
 */
@Slf4j
@RestController
@RequestMapping("/public/specialists")
@RequiredArgsConstructor
@Tag(name = "Public Specialists", description = "Public endpoints for specialists (no authentication required)")
public class PublicSpecialistController {

    private final PublicSpecialistService publicSpecialistService;

    /**
     * Lấy danh sách vocalists (public access)
     * GET /public/specialists/vocalists?gender={gender}&genres={genres}
     */
    @GetMapping("/vocalists")
    @Operation(
        summary = "Get all vocalists (public)", 
        description = "Get all vocalists filtered by gender and genres. No authentication required."
    )
    public ApiResponse<List<Map<String, Object>>> getVocalists(
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) List<String> genres) {
        log.info("GET /public/specialists/vocalists - gender={}, genres={}", gender, genres);
        List<Map<String, Object>> vocalists = publicSpecialistService.getVocalists(gender, genres);
        return ApiResponse.<List<Map<String, Object>>>builder()
                .message("Vocalists retrieved successfully")
                .data(vocalists)
            .build();
    }
    
    /**
     * Lấy danh sách specialists theo skill_id (public access)
     * GET /public/specialists/by-skill/{skillId}
     * Dùng để lấy instrumentalists cho booking
     */
    @GetMapping("/by-skill/{skillId}")
    @Operation(
        summary = "Get specialists by skill ID (public)", 
        description = "Get all specialists that have the specified skill. No authentication required. Used for booking instrumentalists."
    )
    public ApiResponse<List<Map<String, Object>>> getSpecialistsBySkillId(
            @PathVariable("skillId") String skillId) {
        log.info("GET /public/specialists/by-skill/{} - Getting specialists with skill", skillId);
        List<Map<String, Object>> specialists = publicSpecialistService.getSpecialistsBySkillId(skillId);
        return ApiResponse.<List<Map<String, Object>>>builder()
            .message("Specialists retrieved successfully")
            .data(specialists)
                .build();
    }

    /**
     * Lấy chi tiết specialist theo specialistId (public access)
     * GET /public/specialists/{specialistId}
     * Trả về full detail với skills và demos
     */
    @GetMapping("/{specialistId}")
    @Operation(
        summary = "Get specialist detail (public)", 
        description = "Get specialist details by ID including skills and demos. No authentication required."
    )
    public ApiResponse<SpecialistDetailResponse> getSpecialistById(
            @PathVariable String specialistId) {
        log.info("GET /public/specialists/{} - Getting specialist detail", specialistId);
        SpecialistDetailResponse specialistDetail = publicSpecialistService.getSpecialistById(specialistId);
        return ApiResponse.<SpecialistDetailResponse>builder()
            .message("Specialist retrieved successfully")
            .data(specialistDetail)
                .build();
    }
    
    /**
     * Check xem specialist có available trong slot cụ thể không (public access)
     * GET /public/specialists/{specialistId}/availability?date=2024-01-01&startTime=08:00&endTime=10:00
     * Dùng để check work slots khi booking
     */
    @GetMapping("/{specialistId}/availability")
    @Operation(
        summary = "Check specialist availability (public)", 
        description = "Check if a specialist is available for a specific time slot. No authentication required. Used for booking."
    )
    public ApiResponse<Boolean> checkSpecialistAvailability(
            @PathVariable String specialistId,
            @RequestParam String date,
            @RequestParam String startTime,
            @RequestParam String endTime) {
        log.info("GET /public/specialists/{}/availability - date={}, time={}-{}", 
            specialistId, date, startTime, endTime);
        boolean isAvailable = publicSpecialistService.checkSpecialistAvailability(
            specialistId, date, startTime, endTime);
        return ApiResponse.<Boolean>builder()
            .message("Availability checked successfully")
            .data(isAvailable)
            .build();
    }
    
    /**
     * Batch check availability cho nhiều specialists cùng lúc (public access)
     * POST /public/specialists/batch-availability?date=2024-01-01&startTime=08:00&endTime=10:00
     * Body: List<String> specialistIds
     * Dùng để tối ưu hiệu suất khi check nhiều specialists
     */
    @PostMapping("/batch-availability")
    @Operation(
        summary = "Batch check specialist availability (public)", 
        description = "Check availability for multiple specialists at once. No authentication required. Used for optimizing performance when checking many specialists."
    )
    public ApiResponse<Map<String, Boolean>> batchCheckAvailability(
            @RequestParam String date,
            @RequestParam String startTime,
            @RequestParam String endTime,
            @RequestBody List<String> specialistIds) {
        log.info("POST /public/specialists/batch-availability - date={}, time={}-{}, {} specialists", 
            date, startTime, endTime, specialistIds.size());
        Map<String, Boolean> availabilityMap = publicSpecialistService.batchCheckAvailability(
            specialistIds, date, startTime, endTime);
        return ApiResponse.<Map<String, Boolean>>builder()
            .message("Batch availability checked successfully")
            .data(availabilityMap)
            .build();
    }
    
}
