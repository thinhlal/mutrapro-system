package com.mutrapro.identity_service.controller;

import com.mutrapro.identity_service.dto.request.UserSearchRequest;
import com.mutrapro.identity_service.dto.response.UserPageResponse;
import com.mutrapro.identity_service.service.UserSearchService;
import com.mutrapro.identity_service.service.UserService;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.enums.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

/**
 * Admin User Search Controller
 * Handles user search and filtering operations (Admin only)
 */
@Slf4j
@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin - User Search", description = "APIs for searching and filtering users (Admin only)")
@SecurityRequirement(name = "bearerAuth")
public class AdminUserController {

    private final UserSearchService userSearchService;
    private final UserService userService;

    /**
     * Search and filter users with pagination
     */
    @PostMapping("/search")
    @Operation(summary = "Search users", description = "Search and filter users with pagination (SYSTEM_ADMIN only)")
    public ApiResponse<UserPageResponse> searchUsers(@RequestBody UserSearchRequest request) {
        log.info("POST /admin/users/search - Searching users with filters: {}", request);
        UserPageResponse response = userSearchService.searchUsers(request);
        return ApiResponse.<UserPageResponse>builder()
            .message("Users retrieved successfully")
            .data(response)
            .build();
    }

    /**
     * Get user statistics
     */
    @GetMapping("/statistics")
    @Operation(summary = "Get user statistics", description = "Get user statistics for admin dashboard (SYSTEM_ADMIN only)")
    public ApiResponse<UserSearchService.UserStatisticsResponse> getUserStatistics() {
        log.info("GET /admin/users/statistics - Getting user statistics");
        UserSearchService.UserStatisticsResponse stats = userSearchService.getUserStatistics();
        return ApiResponse.<UserSearchService.UserStatisticsResponse>builder()
            .message("User statistics retrieved successfully")
            .data(stats)
            .build();
    }

    /**
     * Update user role (Admin only)
     */
    @PutMapping("/{id}/role")
    @Operation(summary = "Update user role", description = "Update user role (SYSTEM_ADMIN only)")
    public ApiResponse<Void> updateUserRole(
            @PathVariable String id,
            @RequestParam Role role) {
        log.info("PUT /admin/users/{}/role - Updating user role to {}", id, role);
        userService.updateUserRole(id, role);
        return ApiResponse.<Void>builder()
            .message("User role updated successfully")
            .build();
    }
}

