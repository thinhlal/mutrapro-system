package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi không có studio active trong hệ thống
 */
public class NoActiveStudioException extends BusinessException {

    public NoActiveStudioException(String message) {
        super(ProjectServiceErrorCodes.NO_ACTIVE_STUDIO, message);
    }

    public static NoActiveStudioException notFound() {
        return new NoActiveStudioException("No active studio found in the system");
    }

    public static NoActiveStudioException multipleFound(int count) {
        return new NoActiveStudioException(
            String.format("Multiple active studios found (%d). System expects single studio.", count)
        );
    }
}

