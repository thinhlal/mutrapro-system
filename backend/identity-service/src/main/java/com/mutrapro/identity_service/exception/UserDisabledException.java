package com.mutrapro.identity_service.exception;

import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

public class UserDisabledException extends BusinessException {

    public UserDisabledException() {
        super(IdentityServiceErrorCodes.USER_DISABLED, "User disabled");
    }

    public UserDisabledException(String message) {
        super(IdentityServiceErrorCodes.USER_DISABLED, message);
    }

    public UserDisabledException(String message, String key, Object value) {
        super(IdentityServiceErrorCodes.USER_DISABLED, message, key, value);
    }

    public UserDisabledException(String message, Map<String, Object> details) {
        super(IdentityServiceErrorCodes.USER_DISABLED, message, details);
    }

    public UserDisabledException(String message, Throwable cause) {
        super(IdentityServiceErrorCodes.USER_DISABLED, message, cause);
    }

    public UserDisabledException(String message, String key, Object value, Throwable cause) {
        super(IdentityServiceErrorCodes.USER_DISABLED, message, key, value, cause);
    }

    public static UserDisabledException create() {
        return new UserDisabledException("User disabled");
    }
}

