package com.mutrapro.identity_service.controller;

import com.mutrapro.identity_service.dto.response.UserDashboardStatisticsResponse;
import com.mutrapro.identity_service.service.UserService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin Dashboard Controller
 * Cung cấp API tổng quan cho trang thống kê của admin.
 */
@Slf4j
@RestController
@RequestMapping("/admin/dashboard")
@RequiredArgsConstructor
@Tag(name = "Admin - Dashboard", description = "APIs for admin overview dashboard")
@SecurityRequirement(name = "bearerAuth")
public class AdminDashboardController {

    private final UserService userService;

    /**
     * Get all user dashboard statistics in one API call (statistics và statistics over time)
     * Gộp tất cả user statistics để giảm số lượng API calls từ frontend
     */
    @GetMapping("/users")
    @Operation(summary = "Get all user dashboard statistics", description = "Lấy tất cả user statistics (statistics và statistics over time) trong một API call (SYSTEM_ADMIN only)")
    public ApiResponse<UserDashboardStatisticsResponse> getUserDashboardStatistics(
            @Parameter(description = "Number of days to look back for statistics over time (default: 30)")
            @RequestParam(defaultValue = "30") int days) {
        log.info("GET /admin/dashboard/users - Getting all user dashboard statistics for last {} days", days);
        UserDashboardStatisticsResponse stats = userService.getUserDashboardStatistics(days);
        return ApiResponse.<UserDashboardStatisticsResponse>builder()
                .message("User dashboard statistics retrieved successfully")
                .data(stats)
                .build();
    }
}


