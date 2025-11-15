package com.mutrapro.specialist_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Admin tạo skill entity mới (Piano, Guitar, etc.)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSkillRequest {
    
    @NotBlank(message = "Skill name is required")
    @Size(max = 100, message = "Skill name must not exceed 100 characters")
    private String skillName;
    
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;
    
    @Builder.Default
    private Boolean isActive = true;
}

