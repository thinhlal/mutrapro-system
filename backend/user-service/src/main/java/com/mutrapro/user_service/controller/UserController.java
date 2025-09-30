package com.mutrapro.user_service.controller;

import com.mutrapro.user_service.dto.request.*;
import com.mutrapro.user_service.dto.response.*;
import com.mutrapro.user_service.service.UserService;
import com.mutrapro.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Example User Controller với proper exception handling
 */
@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    /**
     * Get user by ID
     */
    @GetMapping("/{id}")
    public ApiResponse<UserResponse> getUser(@PathVariable String id) {
        log.info("Getting user with ID: {}", id);
        UserResponse user = userService.findById(id);
        return ApiResponse.<UserResponse>builder()
            .message("User retrieved successfully")
            .data(user)
            .build();
    }
    
    /**
     * Get user by email
     */
    @GetMapping("/email/{email}")
    public ApiResponse<UserResponse> getUserByEmail(@PathVariable String email) {
        log.info("Getting user with email: {}", email);
        UserResponse user = userService.findByEmail(email);
        return ApiResponse.<UserResponse>builder()
            .message("User retrieved successfully")
            .data(user)
            .build();
    }
    
    /**
     * Create new user
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        log.info("Creating new user with email: {}", request.getEmail());
        UserResponse user = userService.createUser(request);
        return ApiResponse.<UserResponse>builder()
            .message("User created successfully")
            .data(user)
            .statusCode(201)
            .build();
    }
    
    /**
     * Update user
     */
    @PutMapping("/{id}")
    public ApiResponse<UserResponse> updateUser(
            @PathVariable String id, 
            @Valid @RequestBody UpdateUserRequest request) {
        log.info("Updating user with ID: {}", id);
        UserResponse user = userService.updateUser(id, request);
        return ApiResponse.<UserResponse>builder()
            .message("User updated successfully")
            .data(user)
            .build();
    }
    
    /**
     * Delete user
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable String id) {
        log.info("Deleting user with ID: {}", id);
        userService.deleteUser(id);
        return ApiResponse.<Void>builder()
            .message("User deleted successfully")
            .build();
    }
    
    /**
     * Disable user account
     */
    @PostMapping("/{id}/disable")
    public ApiResponse<Void> disableUser(@PathVariable Long id) {
        log.info("Disabling user with ID: {}", id);
        userService.disableUser(id);
        return ApiResponse.<Void>builder()
            .message("User disabled successfully")
            .build();
    }
    
    /**
     * Lock user account
     */
    @PostMapping("/{id}/lock")
    public ApiResponse<Void> lockUser(@PathVariable Long id) {
        log.info("Locking user with ID: {}", id);
        userService.lockUser(id);
        return ApiResponse.<Void>builder()
            .message("User locked successfully")
            .build();
    }
    
    
    /**
     * Get user profile
     */
    @GetMapping("/{id}/profile")
    public ApiResponse<UserProfileResponse> getUserProfile(@PathVariable String id) {
        log.info("Getting profile for user with ID: {}", id);
        UserProfileResponse user = userService.getUserProfile(id);
        return ApiResponse.<UserProfileResponse>builder()
            .message("User profile retrieved successfully")
            .data(user)
            .build();
    }
    
    /**
     * Update user profile
     */
    @PutMapping("/{id}/profile")
    public ApiResponse<UserProfileResponse> updateUserProfile(
            @PathVariable String id, 
            @Valid @RequestBody UpdateUserRequest request) {
        log.info("Updating profile for user with ID: {}", id);
        UserProfileResponse user = userService.updateUserProfile(id, request);
        return ApiResponse.<UserProfileResponse>builder()
            .message("User profile updated successfully")
            .data(user)
            .build();
    }
}
