package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi skill đang được sử dụng và không thể xóa
 */
public class SkillInUseException extends BusinessException {
    
    public SkillInUseException(String message) {
        super(SpecialistServiceErrorCodes.SKILL_IN_USE, message);
    }
    
    public SkillInUseException(String message, Map<String, Object> details) {
        super(SpecialistServiceErrorCodes.SKILL_IN_USE, message, details);
    }
    
    public static SkillInUseException create(String skillId, long specialistCount, long demoCount) {
        String message = String.format(
            "Cannot delete skill. Skill is currently being used by %d specialist(s) and %d demo(s)",
            specialistCount, demoCount
        );
        return new SkillInUseException(
            message,
            Map.of("skillId", skillId != null ? skillId : "unknown",
                   "specialistCount", specialistCount,
                   "demoCount", demoCount)
        );
    }
}

