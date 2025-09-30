package com.mutrapro.auth_service.exception;

import com.mutrapro.auth_service.enums.AuthServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

public class InvalidCredentialsException extends BusinessException {
    public InvalidCredentialsException() {
        super(AuthServiceErrorCodes.INVALID_CREDENTIALS, "Invalid credentials");
    }

    public InvalidCredentialsException(String message) {
        super(AuthServiceErrorCodes.INVALID_CREDENTIALS, message);
    }

    public InvalidCredentialsException(String message, String key, Object value) {
        super(AuthServiceErrorCodes.INVALID_CREDENTIALS, message, key, value);
    }

    public InvalidCredentialsException(String message, Map<String, Object> details) {
        super(AuthServiceErrorCodes.INVALID_CREDENTIALS, message, details);
    }

    public InvalidCredentialsException(String message, Throwable cause) {
        super(AuthServiceErrorCodes.INVALID_CREDENTIALS, message, cause);
    }

    public InvalidCredentialsException(String message, String key, Object value, Throwable cause) {
        super(AuthServiceErrorCodes.INVALID_CREDENTIALS, message, key, value, cause);
    }

    public static InvalidCredentialsException create() {
        return new InvalidCredentialsException("Invalid credentials");
    }
}


