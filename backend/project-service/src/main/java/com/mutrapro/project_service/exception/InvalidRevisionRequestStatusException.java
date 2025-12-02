package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi revision request status không hợp lệ
 */
public class InvalidRevisionRequestStatusException extends BusinessException {

    public InvalidRevisionRequestStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_REVISION_REQUEST_STATUS, message);
    }

    public static InvalidRevisionRequestStatusException invalidStatus(String status) {
        return new InvalidRevisionRequestStatusException("Invalid revision request status: " + status);
    }
}

