package com.mutrapro.user_service.mapper;

import com.mutrapro.user_service.dto.request.CreateUserRequest;
import com.mutrapro.user_service.dto.request.UpdateUserRequest;
import com.mutrapro.user_service.dto.response.AuthenticationResponse;
import com.mutrapro.user_service.dto.response.UserProfileResponse;
import com.mutrapro.user_service.dto.response.UserResponse;
import com.mutrapro.user_service.entity.User;
import com.mutrapro.user_service.enums.UserRole;
import org.mapstruct.*;

import java.util.List;

/**
 * MapStruct Mapper để chuyển đổi giữa User Entity và DTOs
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    /**
     * Convert User Entity to UserResponse DTO
     */
    @Mapping(source = "userId", target = "userId")
    @Mapping(source = "primaryRole", target = "primaryRole")
    @Mapping(expression = "java(getActiveUserRoles(user))", target = "roles")
    UserResponse toUserResponse(User user);

    /**
     * Convert User Entity to UserProfileResponse DTO
     */
    @Mapping(source = "userId", target = "userId")
    @Mapping(source = "primaryRole", target = "primaryRole")
    @Mapping(expression = "java(getActiveUserRoles(user))", target = "roles")
    @Mapping(constant = "0", target = "totalProjects") // TODO: Lấy từ project service
    @Mapping(constant = "0", target = "completedTasks") // TODO: Lấy từ task service
    @Mapping(constant = "0", target = "activeProjects") // TODO: Lấy từ project service
    @Mapping(constant = "null", target = "specialization") // TODO: Lấy từ specialist service
    @Mapping(constant = "null", target = "experienceYears") // TODO: Lấy từ specialist service
    @Mapping(constant = "null", target = "hourlyRate") // TODO: Lấy từ specialist service
    UserProfileResponse toUserProfileResponse(User user);

    /**
     * Convert CreateUserRequest DTO to User Entity
     */
    @Mapping(source = "password", target = "passwordHash") // TODO: Hash password trong service
    @Mapping(constant = "true", target = "isActive")
    @Mapping(constant = "false", target = "emailVerified")
    @Mapping(constant = "false", target = "locked")
    @Mapping(constant = "0", target = "failedLoginAttempts")
    @Mapping(target = "userRoles", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "lockedUntil", ignore = true)
    @Mapping(target = "emailVerificationToken", ignore = true)
    @Mapping(target = "emailVerificationExpires", ignore = true)
    @Mapping(target = "passwordResetToken", ignore = true)
    @Mapping(target = "passwordResetExpires", ignore = true)
    User toUser(CreateUserRequest request);

    /**
     * Update User Entity from UpdateUserRequest DTO
     */
    @Mapping(source = "isActive", target = "isActive")
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "userRoles", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "failedLoginAttempts", ignore = true)
    @Mapping(target = "lockedUntil", ignore = true)
    @Mapping(target = "locked", ignore = true)
    @Mapping(target = "emailVerified", ignore = true)
    @Mapping(target = "emailVerificationToken", ignore = true)
    @Mapping(target = "emailVerificationExpires", ignore = true)
    @Mapping(target = "passwordResetToken", ignore = true)
    @Mapping(target = "passwordResetExpires", ignore = true)
    void updateUserFromRequest(User user, UpdateUserRequest request);

    /**
     * Convert List of User Entities to List of UserResponse DTOs
     */
    List<UserResponse> toUserResponseList(List<User> users);

    /**
     * Convert List of User Entities to List of UserProfileResponse DTOs
     */
    List<UserProfileResponse> toUserProfileResponseList(List<User> users);

    /**
     * Convert User Entity to AuthenticationResponse DTO with tokens
     */
    @Mapping(source = "accessToken", target = "accessToken")
    @Mapping(source = "refreshToken", target = "refreshToken")
    @Mapping(source = "expiresIn", target = "expiresIn")
    @Mapping(source = "user", target = "user")
    @Mapping(expression = "java(user.getLastLoginAt() == null)", target = "isFirstLogin")
    @Mapping(expression = "java(!user.isEmailVerified())", target = "requiresEmailVerification")
    @Mapping(constant = "Bearer", target = "tokenType")
    @Mapping(constant = "Authentication successful", target = "message")
    AuthenticationResponse toAuthenticationResponse(User user, String accessToken, String refreshToken, Long expiresIn);

    /**
     * Convert User Entity to AuthenticationResponse DTO without tokens
     */
    @Mapping(source = "user", target = "user")
    @Mapping(expression = "java(user.getLastLoginAt() == null)", target = "isFirstLogin")
    @Mapping(expression = "java(!user.isEmailVerified())", target = "requiresEmailVerification")
    @Mapping(constant = "User information retrieved successfully", target = "message")
    AuthenticationResponse toAuthenticationResponse(User user);

    /**
     * Helper method to get active user roles from user entity
     */
    @AfterMapping
    default List<UserRole> getActiveUserRoles(User user, @MappingTarget UserResponse.UserResponseBuilder response) {
        if (user.getUserRoles() == null) {
            return List.of();
        }

        return user.getUserRoles().stream()
                .filter(role -> role.isActive())
                .map(role -> role.getRole())
                .toList();
    }

    /**
     * Helper method to get active user roles from user entity for UserProfileResponse
     */
    @AfterMapping
    default List<UserRole> getActiveUserRoles(User user, @MappingTarget UserProfileResponse.UserProfileResponseBuilder response) {
        if (user.getUserRoles() == null) {
            return List.of();
        }

        return user.getUserRoles().stream()
                .filter(role -> role.isActive())
                .map(role -> role.getRole())
                .toList();
    }
}
