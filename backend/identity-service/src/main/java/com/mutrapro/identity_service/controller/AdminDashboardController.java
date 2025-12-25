package com.mutrapro.identity_service.controller;

import com.mutrapro.identity_service.dto.response.UserStatisticsResponse;
import com.mutrapro.identity_service.service.UserService;
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

    @GetMapping("/users")
    @Operation(summary = "Get user statistics for admin dashboard", description = "Lấy thống kê users cho admin dashboard (SYSTEM_ADMIN only)")
    public ApiResponse<UserStatisticsResponse> getUserStatistics() {
        log.info("GET /admin/dashboard/users - Getting user statistics for admin dashboard");
        UserStatisticsResponse stats = userService.getUserStatistics();
        return ApiResponse.<UserStatisticsResponse>builder()
                .message("User statistics retrieved successfully")
                .data(stats)
                .build();
    }
}


