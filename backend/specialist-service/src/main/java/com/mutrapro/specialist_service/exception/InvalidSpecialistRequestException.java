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
    
    /**
     * Khi specialist phải có genres để tạo demos
     */
    public static InvalidSpecialistRequestException specialistGenresRequiredForDemos() {
        return new InvalidSpecialistRequestException(
            "Specialist must have genres to create demos. Please update your profile with your music genres first."
        );
    }
    
    /**
     * Khi demo genre không match với specialist's genres
     */
    public static InvalidSpecialistRequestException demoGenreMismatch(
            String demoGenre, String specialistGenres) {
        return new InvalidSpecialistRequestException(
            String.format("Cannot create demo with genre '%s'. " +
                        "Specialist genres: %s. " +
                        "Demo genres must be within the specialist's genres. Please update your profile genres first.",
                demoGenre, specialistGenres),
            Map.of(
                "demoGenre", demoGenre != null ? demoGenre : "unknown",
                "specialistGenres", specialistGenres != null ? specialistGenres : "unknown"
            )
        );
    }
    
    /**
     * Khi demo thiếu recordingRole
     */
    public static InvalidSpecialistRequestException recordingRoleRequiredForDemo() {
        return new InvalidSpecialistRequestException(
            "Recording role is required for demo. Must specify VOCALIST or INSTRUMENT_PLAYER."
        );
    }
    
    /**
     * Khi demo recordingRole không match với specialist's recordingRoles
     */
    public static InvalidSpecialistRequestException demoRecordingRoleMismatch(
            String demoRole, String specialistRecordingRoles) {
        return new InvalidSpecialistRequestException(
            String.format("Cannot create demo with recording role '%s'. " +
                        "Specialist recordingRoles: %s. " +
                        "Demo recording role must match the specialist's recording roles.",
                demoRole, specialistRecordingRoles),
            Map.of(
                "demoRole", demoRole != null ? demoRole : "unknown",
                "specialistRecordingRoles", specialistRecordingRoles != null ? specialistRecordingRoles : "unknown"
            )
        );
    }
    
    /**
     * Khi demo thiếu genres
     */
    public static InvalidSpecialistRequestException genresRequiredForDemo() {
        return new InvalidSpecialistRequestException(
            "At least one genre is required for demo."
        );
    }
    
    /**
     * Khi INSTRUMENT_PLAYER demo thiếu skill
     */
    public static InvalidSpecialistRequestException skillRequiredForInstrumentDemo() {
        return new InvalidSpecialistRequestException(
            "Skill is required for INSTRUMENT_PLAYER demo. Please select an instrument skill (e.g., Piano Performance, Guitar Performance)."
        );
    }
    
    /**
     * Khi INSTRUMENT_PLAYER demo có skill không phải INSTRUMENT
     */
    public static InvalidSpecialistRequestException instrumentSkillRequiredForInstrumentDemo(String skillName) {
        return new InvalidSpecialistRequestException(
            String.format("Cannot use skill '%s' for INSTRUMENT_PLAYER demo. " +
                        "Only instrument skills (Piano Performance, Guitar Performance, etc.) are allowed.",
                skillName),
            Map.of("skillName", skillName != null ? skillName : "unknown")
        );
    }
    
    /**
     * Khi VOCALIST demo có skill không phải VOCAL
     */
    public static InvalidSpecialistRequestException vocalSkillRequiredForVocalDemo(String skillName) {
        return new InvalidSpecialistRequestException(
            String.format("Cannot use skill '%s' for VOCALIST demo. " +
                        "Only vocal skills (Soprano, Alto, Tenor, etc.) are allowed.",
                skillName),
            Map.of("skillName", skillName != null ? skillName : "unknown")
        );
    }
}

