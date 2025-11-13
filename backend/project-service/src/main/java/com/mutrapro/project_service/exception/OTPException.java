package com.mutrapro.project_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;

public class OTPException extends BusinessException {

    public OTPException(ProjectServiceErrorCodes errorCode, String message) {
        super(errorCode, message);
    }

    public static OTPException invalid() {
        return new OTPException(
            ProjectServiceErrorCodes.INVALID_OTP,
            "Invalid OTP code. Please check and try again."
        );
    }

    public static OTPException expired() {
        return new OTPException(
            ProjectServiceErrorCodes.INVALID_OTP,
            "OTP code has expired. Please request a new one."
        );
    }

    public static OTPException maxAttemptsExceeded(int maxAttempts) {
        return new OTPException(
            ProjectServiceErrorCodes.MAX_OTP_ATTEMPTS_EXCEEDED,
            String.format("Maximum OTP verification attempts (%d) exceeded. Please start a new signing session.", maxAttempts)
        );
    }
}

