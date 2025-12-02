package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi state của entity không hợp lệ cho operation được yêu cầu
 */
public class InvalidStateException extends BusinessException {

    public InvalidStateException(String message) {
        super(ProjectServiceErrorCodes.INVALID_STATE, message);
    }

    public static InvalidStateException noFiles(String entityName) {
        return new InvalidStateException(String.format("%s has no files", entityName));
    }
}

