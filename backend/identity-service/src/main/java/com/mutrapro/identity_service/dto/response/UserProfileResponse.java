package com.mutrapro.identity_service.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO cho User Profile
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileResponse {
    
    private String userId;
    private String email;
    private String fullName;
    private String phone;
    private String address;
    private com.mutrapro.shared.enums.Role role;
    private boolean isActive;
    
    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    
    // Profile statistics (có thể lấy từ các service khác)
    private int totalProjects;
    private int completedTasks;
    private int activeProjects;
    
    // Specialist info (nếu user là specialist) - có thể lấy từ specialist-service
    private String specialization;
    private Integer experienceYears;
    private Double hourlyRate;
}

