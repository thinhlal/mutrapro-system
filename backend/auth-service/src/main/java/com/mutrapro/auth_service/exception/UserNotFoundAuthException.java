package com.mutrapro.auth_service.exception;

import com.mutrapro.auth_service.enums.AuthServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

public class UserNotFoundAuthException extends BusinessException {
    public UserNotFoundAuthException() {
        super(AuthServiceErrorCodes.USER_NOT_FOUND, "User not found");
    }

    public UserNotFoundAuthException(String message) {
        super(AuthServiceErrorCodes.USER_NOT_FOUND, message);
    }

    public UserNotFoundAuthException(String message, String key, Object value) {
        super(AuthServiceErrorCodes.USER_NOT_FOUND, message, key, value);
    }

    public UserNotFoundAuthException(String message, Map<String, Object> details) {
        super(AuthServiceErrorCodes.USER_NOT_FOUND, message, details);
    }

    public UserNotFoundAuthException(String message, Throwable cause) {
        super(AuthServiceErrorCodes.USER_NOT_FOUND, message, cause);
    }

    public UserNotFoundAuthException(String message, String key, Object value, Throwable cause) {
        super(AuthServiceErrorCodes.USER_NOT_FOUND, message, key, value, cause);
    }

    public static UserNotFoundAuthException create() {
        return new UserNotFoundAuthException("User not found");
    }
}


