package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO cho Skill
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponse {
    
    private String skillId;
    
    private String skillName;
    
    private String description;
    
    private Boolean isActive;
    
    private LocalDateTime createdAt;
}

