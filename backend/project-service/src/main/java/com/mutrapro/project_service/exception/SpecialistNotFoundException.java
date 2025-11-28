package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

/**
 * Exception khi không tìm thấy specialist
 */
public class SpecialistNotFoundException extends ResourceNotFoundException {

    public SpecialistNotFoundException(String specialistId) {
        super(
            ProjectServiceErrorCodes.SPECIALIST_NOT_FOUND,
            String.format("Specialist not found: %s", specialistId)
        );
    }

    public static SpecialistNotFoundException byId(String specialistId) {
        return new SpecialistNotFoundException(specialistId);
    }
}

