package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.ForbiddenException;

import java.util.Map;

/**
 * Exception khi specialist cố gắng truy cập/sửa đổi resource không thuộc về mình
 */
public class AccessDeniedException extends ForbiddenException {
    
    public AccessDeniedException(String message) {
        super(SpecialistServiceErrorCodes.ACCESS_DENIED, message);
    }
    
    public AccessDeniedException(String message, Map<String, Object> details) {
        super(SpecialistServiceErrorCodes.ACCESS_DENIED, message, details);
    }
    
    /**
     * Khi specialist cố gắng update skill không thuộc về mình
     */
    public static AccessDeniedException cannotUpdateSkill(String specialistSkillId) {
        return new AccessDeniedException(
            "You can only update your own skills",
            Map.of("specialistSkillId", specialistSkillId != null ? specialistSkillId : "unknown")
        );
    }
    
    /**
     * Khi specialist cố gắng delete skill không thuộc về mình
     */
    public static AccessDeniedException cannotDeleteSkill(String specialistSkillId) {
        return new AccessDeniedException(
            "You can only delete your own skills",
            Map.of("specialistSkillId", specialistSkillId != null ? specialistSkillId : "unknown")
        );
    }
    
    /**
     * Khi specialist cố gắng update demo không thuộc về mình
     */
    public static AccessDeniedException cannotUpdateDemo(String demoId) {
        return new AccessDeniedException(
            "You can only update your own demos",
            Map.of("demoId", demoId != null ? demoId : "unknown")
        );
    }
    
    /**
     * Khi specialist cố gắng delete demo không thuộc về mình
     */
    public static AccessDeniedException cannotDeleteDemo(String demoId) {
        return new AccessDeniedException(
            "You can only delete your own demos",
            Map.of("demoId", demoId != null ? demoId : "unknown")
        );
    }
    
    /**
     * Khi specialist không phải Recording Artist cố gắng truy cập demos
     */
    public static AccessDeniedException cannotAccessDemos() {
        return new AccessDeniedException(
            "Only Recording Artist specialists can manage demos"
        );
    }
}

