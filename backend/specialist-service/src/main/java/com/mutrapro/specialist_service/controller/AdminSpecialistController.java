package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.request.CreateSpecialistRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSpecialistStatusRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSpecialistSettingsRequest;
import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.service.AdminSpecialistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cho Admin quản lý specialist
 */
@Slf4j
@RestController
@RequestMapping("/admin/specialists")
@RequiredArgsConstructor
public class AdminSpecialistController {
    
    private final AdminSpecialistService adminSpecialistService;
    
    /**
     * Tạo specialist mới từ user
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SpecialistResponse> createSpecialist(@Valid @RequestBody CreateSpecialistRequest request) {
        log.info("POST /admin/specialists - Creating specialist for user email: {}", request.getEmail());
        SpecialistResponse response = adminSpecialistService.createSpecialist(request);
        return ApiResponse.<SpecialistResponse>builder()
            .message("Specialist created successfully")
            .data(response)
            .statusCode(201)
            .build();
    }
    
    /**
     * Lấy danh sách tất cả specialist
     */
    @GetMapping
    public ApiResponse<List<SpecialistResponse>> getAllSpecialists() {
        log.info("GET /admin/specialists - Getting all specialists");
        List<SpecialistResponse> specialists = adminSpecialistService.getAllSpecialists();
        return ApiResponse.<List<SpecialistResponse>>builder()
            .message("Specialists retrieved successfully")
            .data(specialists)
            .build();
    }
    
    /**
     * Lấy specialist theo ID
     */
    @GetMapping("/{id}")
    public ApiResponse<SpecialistResponse> getSpecialistById(@PathVariable String id) {
        log.info("GET /admin/specialists/{} - Getting specialist", id);
        SpecialistResponse response = adminSpecialistService.getSpecialistById(id);
        return ApiResponse.<SpecialistResponse>builder()
            .message("Specialist retrieved successfully")
            .data(response)
            .build();
    }
    
    /**
     * Lấy specialist theo user ID
     */
    @GetMapping("/user/{userId}")
    public ApiResponse<SpecialistResponse> getSpecialistByUserId(@PathVariable String userId) {
        log.info("GET /admin/specialists/user/{} - Getting specialist", userId);
        SpecialistResponse response = adminSpecialistService.getSpecialistByUserId(userId);
        return ApiResponse.<SpecialistResponse>builder()
            .message("Specialist retrieved successfully")
            .data(response)
            .build();
    }
    
    /**
     * Cập nhật status của specialist
     */
    @PutMapping("/{id}/status")
    public ApiResponse<SpecialistResponse> updateSpecialistStatus(
            @PathVariable String id,
            @Valid @RequestBody UpdateSpecialistStatusRequest request) {
        log.info("PUT /admin/specialists/{}/status - Updating status to {}", id, request.getStatus());
        SpecialistResponse response = adminSpecialistService.updateSpecialistStatus(id, request);
        return ApiResponse.<SpecialistResponse>builder()
            .message("Specialist status updated successfully")
            .data(response)
            .build();
    }
    
    /**
     * Cập nhật max_concurrent_tasks
     */
    @PutMapping("/{id}/settings")
    public ApiResponse<SpecialistResponse> updateSpecialistSettings(
            @PathVariable String id,
            @Valid @RequestBody UpdateSpecialistSettingsRequest request) {
        log.info("PUT /admin/specialists/{}/settings - Updating settings", id);
        SpecialistResponse response = adminSpecialistService.updateSpecialistSettings(id, request);
        return ApiResponse.<SpecialistResponse>builder()
            .message("Specialist settings updated successfully")
            .data(response)
            .build();
    }
    
    /**
     * Lấy danh sách specialist theo specialization và status
     */
    @GetMapping("/filter")
    public ApiResponse<List<SpecialistResponse>> getSpecialistsByFilter(
            @RequestParam(required = false) SpecialistType specialization,
            @RequestParam(required = false) SpecialistStatus status) {
        log.info("GET /admin/specialists/filter - Filtering by specialization: {}, status: {}", specialization, status);
        
        List<SpecialistResponse> specialists;
        if (specialization != null && status != null) {
            specialists = adminSpecialistService.getSpecialistsBySpecializationAndStatus(specialization, status);
        } else {
            // If no filter, return all
            specialists = adminSpecialistService.getAllSpecialists();
        }
        
        return ApiResponse.<List<SpecialistResponse>>builder()
            .message("Specialists retrieved successfully")
            .data(specialists)
            .build();
    }
}

