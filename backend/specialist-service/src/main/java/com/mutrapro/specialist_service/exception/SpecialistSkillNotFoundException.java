package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy specialist skill
 */
public class SpecialistSkillNotFoundException extends ResourceNotFoundException {
    
    public SpecialistSkillNotFoundException(String message) {
        super(SpecialistServiceErrorCodes.SPECIALIST_SKILL_NOT_FOUND, message);
    }
    
    public SpecialistSkillNotFoundException(String message, String specialistSkillId) {
        super(SpecialistServiceErrorCodes.SPECIALIST_SKILL_NOT_FOUND, message, 
              Map.of("specialistSkillId", specialistSkillId != null ? specialistSkillId : "unknown"));
    }
    
    public static SpecialistSkillNotFoundException byId(String id) {
        return new SpecialistSkillNotFoundException(
            "Specialist skill not found with ID: " + id,
            id
        );
    }
}

