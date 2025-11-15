package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.ProficiencyLevel;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Request DTO để Specialist cập nhật skill của mình (SpecialistSkill)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSkillRequest {
    
    @NotNull(message = "Proficiency level is required")
    private ProficiencyLevel proficiencyLevel;
    
    @Min(value = 0, message = "Years of experience must be non-negative")
    private Integer yearsExperience;
    
    private LocalDate lastUsedDate;
    
    private Boolean isCertified;
    
    private String certificationDetails;
}
