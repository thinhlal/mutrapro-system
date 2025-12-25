package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.response.AllProjectStatisticsResponse;
import com.mutrapro.project_service.service.AdminStatisticsService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin API: thống kê tổng quan contracts và tasks cho dashboard.
 */
@Slf4j
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Tag(name = "Admin - Project Statistics", description = "Admin APIs for contract and task statistics")
@SecurityRequirement(name = "bearerAuth")
public class AdminProjectStatisticsController {

    private final AdminStatisticsService statisticsService;

    /**
     * Get all project statistics in one API call (contracts, tasks, và module statistics)
     * Gộp tất cả project statistics để giảm số lượng API calls từ frontend
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get all project statistics", description = "Lấy tất cả project statistics (contracts, tasks, equipment, studio bookings, revision requests) trong một API call")
    public ApiResponse<AllProjectStatisticsResponse> getAllProjectStatistics() {
        log.info("GET /admin/statistics - Getting all project statistics");
        AllProjectStatisticsResponse stats = statisticsService.getAllProjectStatisticsCombined();
        return ApiResponse.<AllProjectStatisticsResponse>builder()
                .message("All project statistics retrieved successfully")
                .data(stats)
                .build();
    }
}

