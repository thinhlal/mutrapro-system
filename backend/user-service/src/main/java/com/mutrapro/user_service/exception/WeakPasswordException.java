package com.mutrapro.user_service.exception;

import com.mutrapro.shared.exception.ValidationException;
import com.mutrapro.user_service.enums.UserServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi password không đủ mạnh
 */
public class WeakPasswordException extends ValidationException {
    
    public WeakPasswordException(String message) {
        super(UserServiceErrorCodes.WEAK_PASSWORD, message);
    }
    
    public WeakPasswordException(String message, String key, Object value) {
        super(UserServiceErrorCodes.WEAK_PASSWORD, message, key, value);
    }
    
    public WeakPasswordException(String message, Map<String, Object> details) {
        super(UserServiceErrorCodes.WEAK_PASSWORD, message, details);
    }
    
    public static WeakPasswordException withRequirements() {
        return new WeakPasswordException(
            "Password must be at least 8 characters with uppercase, lowercase, number and special character"
        );
    }
}
