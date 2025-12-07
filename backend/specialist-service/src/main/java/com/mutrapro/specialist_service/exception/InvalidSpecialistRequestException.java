package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi request tạo/cập nhật specialist không hợp lệ
 */
public class InvalidSpecialistRequestException extends BusinessException {
    
    public InvalidSpecialistRequestException(String message) {
        super(SpecialistServiceErrorCodes.INVALID_SPECIALIST_REQUEST, message);
    }
    
    public InvalidSpecialistRequestException(String message, Map<String, Object> details) {
        super(SpecialistServiceErrorCodes.INVALID_SPECIALIST_REQUEST, message, details);
    }
    
    /**
     * Khi recordingRoles là bắt buộc nhưng không được cung cấp
     */
    public static InvalidSpecialistRequestException recordingRolesRequired() {
        return new InvalidSpecialistRequestException(
            "recordingRoles is required when specialization is RECORDING_ARTIST. " +
            "Must specify at least one role: VOCALIST or INSTRUMENT_PLAYER"
        );
    }
    
    /**
     * Khi specialist phải có recordingRoles để add skills
     */
    public static InvalidSpecialistRequestException recordingRolesRequiredForSkills() {
        return new InvalidSpecialistRequestException(
            "Specialist must have recordingRoles to add skills"
        );
    }
    
    /**
     * Khi skill category không match với recordingRoles
     */
    public static InvalidSpecialistRequestException skillCategoryMismatch(
            String skillName, String skillCategory, String recordingRoles) {
        return new InvalidSpecialistRequestException(
            String.format("Cannot add skill '%s' with category '%s'. " +
                        "Specialist recordingRoles: %s. " +
                        "Only skills matching the specialist's recording roles are allowed.",
                skillName, skillCategory, recordingRoles),
            Map.of(
                "skillName", skillName != null ? skillName : "unknown",
                "skillCategory", skillCategory != null ? skillCategory : "unknown",
                "recordingRoles", recordingRoles != null ? recordingRoles : "unknown"
            )
        );
    }
}

