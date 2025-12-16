package com.mutrapro.identity_service.controller;

import com.mutrapro.identity_service.dto.response.AdminDashboardOverviewResponse;
import com.mutrapro.identity_service.service.AdminDashboardService;
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

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/overview")
    @Operation(summary = "Get admin dashboard overview", description = "Tổng hợp thống kê users + ví & giao dịch cho admin dashboard (SYSTEM_ADMIN only)")
    public ApiResponse<AdminDashboardOverviewResponse> getOverview() {
        log.info("GET /admin/dashboard/overview - Getting admin dashboard overview");
        AdminDashboardOverviewResponse overview = adminDashboardService.getOverview();
        return ApiResponse.<AdminDashboardOverviewResponse>builder()
                .message("Admin dashboard overview retrieved successfully")
                .data(overview)
                .build();
    }
}


