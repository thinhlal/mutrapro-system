package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.UnauthorizedException;

/**
 * Exception khi không tìm thấy specialist ID trong JWT token
 */
public class SpecialistIdNotFoundException extends UnauthorizedException {

    public SpecialistIdNotFoundException(String message) {
        super(ProjectServiceErrorCodes.SPECIALIST_ID_NOT_FOUND, message);
    }

    public static SpecialistIdNotFoundException inToken() {
        return new SpecialistIdNotFoundException(
            "Specialist ID not found in JWT token. Please login again to refresh token."
        );
    }
}

