package com.mutrapro.specialist_service.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Admin cập nhật skill entity
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateSkillRequest {
    
    @Size(max = 100, message = "Skill name must not exceed 100 characters")
    private String skillName;
    
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
    
    private Boolean isActive;
}

