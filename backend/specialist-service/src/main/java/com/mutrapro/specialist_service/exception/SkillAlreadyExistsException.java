package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi skill đã tồn tại
 */
public class SkillAlreadyExistsException extends BusinessException {
    
    public SkillAlreadyExistsException(String message) {
        super(SpecialistServiceErrorCodes.SKILL_ALREADY_EXISTS, message);
    }
    
    public SkillAlreadyExistsException(String message, Map<String, Object> details) {
        super(SpecialistServiceErrorCodes.SKILL_ALREADY_EXISTS, message, details);
    }
    
    /**
     * Khi skill name đã tồn tại (cho Skill entity)
     */
    public static SkillAlreadyExistsException byName(String skillName) {
        return new SkillAlreadyExistsException(
            "Skill with name '" + skillName + "' already exists",
            Map.of("skillName", skillName != null ? skillName : "unknown")
        );
    }
    
    /**
     * Khi skill đã tồn tại cho specialist (cho SpecialistSkill)
     */
    public static SkillAlreadyExistsException create(String specialistId, String skillId) {
        return new SkillAlreadyExistsException(
            "Skill already exists for this specialist",
            Map.of("specialistId", specialistId != null ? specialistId : "unknown",
                   "skillId", skillId != null ? skillId : "unknown")
        );
    }
}

