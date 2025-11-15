package com.mutrapro.specialist_service.dto.response;

import com.mutrapro.specialist_service.enums.ProficiencyLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Response DTO cho SpecialistSkill
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistSkillResponse {
    
    private String specialistSkillId;
    
    private String specialistId;
    
    private SkillResponse skill;
    
    private ProficiencyLevel proficiencyLevel;
    
    private Integer yearsExperience;
    
    private LocalDate lastUsedDate;
    
    private Boolean isCertified;
    
    private String certificationDetails;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}

