package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.response.RequestModuleStatisticsResponse;
import com.mutrapro.request_service.service.AdminRequestStatisticsService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin API: thống kê tổng quan service requests cho dashboard.
 */
@Slf4j
@RestController
@RequestMapping("/admin/requests")
@RequiredArgsConstructor
@Tag(name = "Admin - Request Statistics", description = "Admin APIs for request statistics")
public class AdminRequestStatisticsController {

    private final AdminRequestStatisticsService statisticsService;

    /**
     * Get all request module statistics in one API call (requests và notation instruments)
     * Gộp tất cả request statistics để giảm số lượng API calls từ frontend
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get all request module statistics", description = "Lấy tất cả request statistics (requests và notation instruments) trong một API call")
    public ApiResponse<RequestModuleStatisticsResponse> getAllRequestModuleStatistics() {
        log.info("GET /admin/requests/statistics - Getting all request module statistics");
        RequestModuleStatisticsResponse stats = statisticsService.getAllRequestModuleStatistics();
        return ApiResponse.<RequestModuleStatisticsResponse>builder()
                .message("All request module statistics retrieved successfully")
                .data(stats)
                .build();
    }
}


