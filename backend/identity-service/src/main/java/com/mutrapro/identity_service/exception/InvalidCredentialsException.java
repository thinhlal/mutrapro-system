package com.mutrapro.identity_service.exception;

import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

public class InvalidCredentialsException extends BusinessException {
    public InvalidCredentialsException() {
        super(IdentityServiceErrorCodes.INVALID_CREDENTIALS, "Invalid credentials");
    }

    public InvalidCredentialsException(String message) {
        super(IdentityServiceErrorCodes.INVALID_CREDENTIALS, message);
    }

    public InvalidCredentialsException(String message, String key, Object value) {
        super(IdentityServiceErrorCodes.INVALID_CREDENTIALS, message, key, value);
    }

    public InvalidCredentialsException(String message, Map<String, Object> details) {
        super(IdentityServiceErrorCodes.INVALID_CREDENTIALS, message, details);
    }

    public InvalidCredentialsException(String message, Throwable cause) {
        super(IdentityServiceErrorCodes.INVALID_CREDENTIALS, message, cause);
    }

    public InvalidCredentialsException(String message, String key, Object value, Throwable cause) {
        super(IdentityServiceErrorCodes.INVALID_CREDENTIALS, message, key, value, cause);
    }

    public static InvalidCredentialsException create() {
        return new InvalidCredentialsException("Wrong username or password!!!");
    }
}

