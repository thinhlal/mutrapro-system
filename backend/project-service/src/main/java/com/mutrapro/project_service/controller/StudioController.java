package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.UpdateStudioRequest;
import com.mutrapro.project_service.dto.response.StudioInfoResponse;
import com.mutrapro.project_service.service.StudioBookingService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Slf4j
@RestController
@RequestMapping("/admin/studios")
@RequiredArgsConstructor
@Tag(name = "Studio Management", description = "API quản lý studio (Admin only)")
@FieldDefaults(level = PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
public class StudioController {

    StudioBookingService studioBookingService;

    /**
     * Lấy tất cả studios (cho admin)
     * GET /admin/studios
     */
    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả studios", description = "Admin only")
    public ResponseEntity<ApiResponse<List<StudioInfoResponse>>> getAllStudios() {
        log.info("Getting all studios for admin");
        
        List<StudioInfoResponse> studios = studioBookingService.getAllStudios();
        
        return ResponseEntity.ok(ApiResponse.<List<StudioInfoResponse>>builder()
            .message("Studios retrieved successfully")
            .data(studios)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }

    /**
     * Lấy thông tin studio active (cho admin và customer)
     * GET /admin/studios/active
     */
    @GetMapping("/active")
    @Operation(summary = "Lấy thông tin studio active", description = "Admin only")
    public ResponseEntity<ApiResponse<StudioInfoResponse>> getActiveStudio() {
        log.info("Getting active studio info for admin");
        
        StudioInfoResponse studio = studioBookingService.getActiveStudio();
        
        return ResponseEntity.ok(ApiResponse.<StudioInfoResponse>builder()
            .message("Active studio retrieved successfully")
            .data(studio)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }

    /**
     * Cập nhật studio (cho admin)
     * PUT /admin/studios/{studioId}
     */
    @PutMapping("/{studioId}")
    @Operation(summary = "Cập nhật thông tin studio", description = "Admin only")
    public ResponseEntity<ApiResponse<StudioInfoResponse>> updateStudio(
            @PathVariable("studioId") String studioId,
            @Valid @RequestBody UpdateStudioRequest request) {
        log.info("Updating studio: studioId={}", studioId);
        
        StudioInfoResponse updated = studioBookingService.updateStudio(studioId, request);
        
        return ResponseEntity.ok(ApiResponse.<StudioInfoResponse>builder()
            .message("Studio updated successfully")
            .data(updated)
            .statusCode(HttpStatus.OK.value())
            .status("success")
            .build());
    }
}

