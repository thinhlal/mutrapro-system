package com.mutrapro.user_service.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.mutrapro.user_service.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO cho User - Dựa theo ERD Table users
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserResponse {
    
    private String userId;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private String address;
    private UserRole primaryRole;
    private boolean isActive;
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // User roles (nếu cần)
    private List<UserRole> roles;
}
