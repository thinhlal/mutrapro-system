package com.mutrapro.user_service.exception;

import com.mutrapro.shared.exception.ForbiddenException;
import com.mutrapro.user_service.enums.UserServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi User account bị disabled
 */
public class UserAccountDisabledException extends ForbiddenException {
    
    public UserAccountDisabledException(String message) {
        super(UserServiceErrorCodes.USER_ACCOUNT_DISABLED, message);
    }
    
    public UserAccountDisabledException(String message, String key, Object value) {
        super(UserServiceErrorCodes.USER_ACCOUNT_DISABLED, message, key, value);
    }
    
    public UserAccountDisabledException(String message, Map<String, Object> details) {
        super(UserServiceErrorCodes.USER_ACCOUNT_DISABLED, message, details);
    }
    
    public static UserAccountDisabledException byAdmin() {
        return new UserAccountDisabledException("User account has been disabled by administrator");
    }
    
    public static UserAccountDisabledException byUser() {
        return new UserAccountDisabledException("User account has been disabled");
    }
}
