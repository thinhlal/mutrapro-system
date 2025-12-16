package com.mutrapro.request_service.controller;

import com.mutrapro.request_service.dto.response.RequestStatisticsResponse;
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

    @GetMapping("/statistics")
    @Operation(summary = "Get request statistics", description = "Thống kê tổng quan service requests cho admin dashboard")
    public ApiResponse<RequestStatisticsResponse> getStatistics() {
        log.info("GET /admin/requests/statistics - Getting request statistics");
        RequestStatisticsResponse stats = statisticsService.getStatistics();
        return ApiResponse.<RequestStatisticsResponse>builder()
                .message("Request statistics retrieved successfully")
                .data(stats)
                .build();
    }
}


