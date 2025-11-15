package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.request.UpdateDemoVisibilityRequest;
import com.mutrapro.specialist_service.dto.response.ArtistDemoResponse;
import com.mutrapro.specialist_service.service.AdminDemoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cho Admin quản lý demo visibility
 */
@Slf4j
@RestController
@RequestMapping("/admin/demos")
@RequiredArgsConstructor
@Tag(name = "Admin Demo Management", description = "APIs for admin to manage demo visibility")
public class AdminDemoController {
    
    private final AdminDemoService adminDemoService;
    
    /**
     * Lấy tất cả demos
     */
    @GetMapping
    @Operation(summary = "Get all demos", description = "Get all demos (SYSTEM_ADMIN only)")
    public ApiResponse<List<ArtistDemoResponse>> getAllDemos() {
        log.info("GET /admin/demos - Getting all demos");
        List<ArtistDemoResponse> demos = adminDemoService.getAllDemos();
        return ApiResponse.<List<ArtistDemoResponse>>builder()
            .message("Demos retrieved successfully")
            .data(demos)
            .build();
    }
    
    /**
     * Lấy demo theo ID
     */
    @GetMapping("/{demoId}")
    @Operation(summary = "Get demo by ID", description = "Get demo by ID (SYSTEM_ADMIN only)")
    public ApiResponse<ArtistDemoResponse> getDemoById(@PathVariable String demoId) {
        log.info("GET /admin/demos/{} - Getting demo", demoId);
        ArtistDemoResponse demo = adminDemoService.getDemoById(demoId);
        return ApiResponse.<ArtistDemoResponse>builder()
            .message("Demo retrieved successfully")
            .data(demo)
            .build();
    }
    
    /**
     * Cập nhật visibility của demo (is_public, is_featured)
     */
    @PutMapping("/{demoId}/visibility")
    @Operation(summary = "Update demo visibility", description = "Update demo visibility (is_public, is_featured) (SYSTEM_ADMIN only)")
    public ApiResponse<ArtistDemoResponse> updateDemoVisibility(
            @PathVariable String demoId,
            @Valid @RequestBody UpdateDemoVisibilityRequest request) {
        log.info("PUT /admin/demos/{}/visibility - Updating demo visibility", demoId);
        ArtistDemoResponse response = adminDemoService.updateDemoVisibility(demoId, request);
        return ApiResponse.<ArtistDemoResponse>builder()
            .message("Demo visibility updated successfully")
            .data(response)
            .build();
    }
}

