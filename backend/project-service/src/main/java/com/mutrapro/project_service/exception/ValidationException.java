package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi validation thất bại (missing required fields, invalid input, etc.)
 */
public class ValidationException extends BusinessException {

    public ValidationException(String message) {
        super(ProjectServiceErrorCodes.VALIDATION_ERROR, message);
    }

    public static ValidationException missingField(String fieldName) {
        return new ValidationException(String.format("%s is required", fieldName));
    }

    public static ValidationException invalidValue(String fieldName, String reason) {
        return new ValidationException(String.format("Invalid %s: %s", fieldName, reason));
    }

    public static ValidationException invalidAction(String action, String validActions) {
        return new ValidationException(String.format("Invalid action: %s. Must be %s", action, validActions));
    }
}

