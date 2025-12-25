package com.mutrapro.identity_service.controller;

import com.mutrapro.identity_service.dto.request.CreateFullUserRequest;
import com.mutrapro.identity_service.dto.request.UserSearchRequest;
import com.mutrapro.identity_service.dto.response.FullUserResponse;
import com.mutrapro.identity_service.dto.response.UserBasicInfoResponse;
import com.mutrapro.identity_service.dto.response.UserPageResponse;
import com.mutrapro.identity_service.dto.response.UserStatisticsResponse;
import com.mutrapro.identity_service.service.UserService;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.enums.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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

    private final UserService userService;

    /**
     * Search and filter users with pagination
     */
    @PostMapping("/search")
    @Operation(summary = "Search users", description = "Search and filter users with pagination (SYSTEM_ADMIN only)")
    public ApiResponse<UserPageResponse> searchUsers(@RequestBody UserSearchRequest request) {
        log.info("POST /admin/users/search - Searching users with filters: {}", request);
        UserPageResponse response = userService.searchUsers(request);
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
    public ApiResponse<UserStatisticsResponse> getUserStatistics() {
        log.info("GET /admin/users/statistics - Getting user statistics");
        UserStatisticsResponse stats = userService.getUserStatistics();
        return ApiResponse.<UserStatisticsResponse>builder()
            .message("User statistics retrieved successfully")
            .data(stats)
            .build();
    }

    /**
     * Get user by email (Admin only)
     */
    @GetMapping("/by-email/{email}")
    @Operation(summary = "Get user by email", description = "Get user information by email (SYSTEM_ADMIN only)")
    public ApiResponse<FullUserResponse> getUserByEmail(
            @PathVariable String email) {
        log.info("GET /admin/users/by-email/{} - Getting user by email", email);
        FullUserResponse user = userService.getUserByEmail(email);
        return ApiResponse.<FullUserResponse>builder()
            .message("User retrieved successfully")
            .data(user)
            .build();
    }

    /**
     * Get basic user info by ID (Admin only)
     */
    @GetMapping("/{id}/basic")
    @Operation(summary = "Get basic user info", description = "Get basic user info by ID (SYSTEM_ADMIN only)")
    public ApiResponse<UserBasicInfoResponse> getBasicUserInfo(
            @PathVariable String id) {
        log.info("GET /admin/users/{}/basic - Getting basic info", id);
        var user = userService.getFullUser(id);
        var response = UserBasicInfoResponse.builder()
            .userId(user.getUserId())
            .email(user.getEmail())
            .fullName(user.getFullName())
            .build();
        return ApiResponse.<UserBasicInfoResponse>builder()
            .message("User basic info retrieved successfully")
            .data(response)
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

    /**
     * Create new user (Admin only)
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create new user", description = "Create a new user with full information (SYSTEM_ADMIN only)")
    public ApiResponse<FullUserResponse> createUser(@Valid @RequestBody CreateFullUserRequest request) {
        log.info("POST /admin/users - Creating new user with email: {}", request.getEmail());
        FullUserResponse user = userService.createFullUser(request);
        return ApiResponse.<FullUserResponse>builder()
            .message("User created successfully")
            .data(user)
            .statusCode(HttpStatus.CREATED.value())
            .build();
    }
}

