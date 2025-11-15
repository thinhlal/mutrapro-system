package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy skill
 */
public class SkillNotFoundException extends ResourceNotFoundException {
    
    public SkillNotFoundException(String message) {
        super(SpecialistServiceErrorCodes.SKILL_NOT_FOUND, message);
    }
    
    public SkillNotFoundException(String message, String skillId) {
        super(SpecialistServiceErrorCodes.SKILL_NOT_FOUND, message, 
              Map.of("skillId", skillId != null ? skillId : "unknown"));
    }
    
    public static SkillNotFoundException byId(String id) {
        return new SkillNotFoundException(
            "Skill not found with ID: " + id,
            id
        );
    }
}

