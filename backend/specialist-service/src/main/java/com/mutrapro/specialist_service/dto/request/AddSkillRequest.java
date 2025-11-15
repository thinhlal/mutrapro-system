package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.ProficiencyLevel;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request DTO để Specialist thêm skill
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddSkillRequest {
    
    @NotNull(message = "Skill ID is required")
    private String skillId;
    
    @NotNull(message = "Proficiency level is required")
    private ProficiencyLevel proficiencyLevel;
    
    private Integer yearsExperience;
    
    private LocalDate lastUsedDate;
    
    private Boolean isCertified;
    
    private String certificationDetails;
}

