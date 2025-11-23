package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi thiếu reason (cho request change hoặc cancellation)
 */
public class MissingReasonException extends BusinessException {

    public MissingReasonException(String message) {
        super(ProjectServiceErrorCodes.MISSING_REASON, message);
    }

    /**
     * Error khi thiếu reason cho request change
     */
    public static MissingReasonException forRequestChange() {
        return new MissingReasonException("Reason is required for request change");
    }

    /**
     * Error khi thiếu reason cho cancellation
     */
    public static MissingReasonException forCancellation() {
        return new MissingReasonException("Reason is required for cancellation");
    }
}

