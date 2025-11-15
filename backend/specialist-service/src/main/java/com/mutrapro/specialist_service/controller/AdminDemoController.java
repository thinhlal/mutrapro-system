package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.request.UpdateDemoVisibilityRequest;
import com.mutrapro.specialist_service.dto.response.ArtistDemoResponse;
import com.mutrapro.specialist_service.service.AdminDemoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;


/**
 * Controller cho Admin quản lý demo visibility
 */
@Slf4j
@RestController
@RequestMapping("/admin/demos")
@RequiredArgsConstructor
public class AdminDemoController {
    
    private final AdminDemoService adminDemoService;
    
    /**
     * Cập nhật visibility của demo (is_public, is_featured)
     */
    @PutMapping("/{demoId}/visibility")
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

