package com.mutrapro.user_service.exception;

import com.mutrapro.shared.exception.ForbiddenException;
import com.mutrapro.user_service.enums.UserServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi User account bị locked
 */
public class UserAccountLockedException extends ForbiddenException {
    
    public UserAccountLockedException(String message) {
        super(UserServiceErrorCodes.USER_ACCOUNT_LOCKED, message);
    }
    
    public UserAccountLockedException(String message, String key, Object value) {
        super(UserServiceErrorCodes.USER_ACCOUNT_LOCKED, message, key, value);
    }
    
    public UserAccountLockedException(String message, Map<String, Object> details) {
        super(UserServiceErrorCodes.USER_ACCOUNT_LOCKED, message, details);
    }
    
    public static UserAccountLockedException tooManyFailedAttempts() {
        return new UserAccountLockedException(
            "Account locked due to too many failed login attempts",
            Map.of(
                "reason", "too_many_failed_attempts",
                "action", "contact_administrator_or_wait"
            )
        );
    }
    
    public static UserAccountLockedException byAdmin() {
        return new UserAccountLockedException("User account has been locked by administrator");
    }
}
