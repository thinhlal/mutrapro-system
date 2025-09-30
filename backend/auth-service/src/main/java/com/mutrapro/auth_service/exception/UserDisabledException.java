package com.mutrapro.auth_service.exception;

import com.mutrapro.auth_service.enums.AuthServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

public class UserDisabledException extends BusinessException {

    public UserDisabledException() {
        super(AuthServiceErrorCodes.USER_DISABLED, "User disabled");
    }

    public UserDisabledException(String message) {
        super(AuthServiceErrorCodes.USER_DISABLED, message);
    }

    public UserDisabledException(String message, String key, Object value) {
        super(AuthServiceErrorCodes.USER_DISABLED, message, key, value);
    }

    public UserDisabledException(String message, Map<String, Object> details) {
        super(AuthServiceErrorCodes.USER_DISABLED, message, details);
    }

    public UserDisabledException(String message, Throwable cause) {
        super(AuthServiceErrorCodes.USER_DISABLED, message, cause);
    }

    public UserDisabledException(String message, String key, Object value, Throwable cause) {
        super(AuthServiceErrorCodes.USER_DISABLED, message, key, value, cause);
    }

    public static UserDisabledException create() {
        return new UserDisabledException("User disabled");
    }
}


