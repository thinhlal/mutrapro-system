package com.mutrapro.user_service.exception;

import com.mutrapro.shared.exception.UnauthorizedException;
import com.mutrapro.user_service.enums.UserServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi User credentials không hợp lệ
 */
public class InvalidUserCredentialsException extends UnauthorizedException {
    
    public InvalidUserCredentialsException(String message) {
        super(UserServiceErrorCodes.INVALID_USER_CREDENTIALS, message);
    }
    
    public InvalidUserCredentialsException(String message, String key, Object value) {
        super(UserServiceErrorCodes.INVALID_USER_CREDENTIALS, message, key, value);
    }
    
    public InvalidUserCredentialsException(String message, Map<String, Object> details) {
        super(UserServiceErrorCodes.INVALID_USER_CREDENTIALS, message, details);
    }
    
    public static InvalidUserCredentialsException wrongPassword() {
        return new InvalidUserCredentialsException("Invalid password provided");
    }
    
    public static InvalidUserCredentialsException wrongCredentials() {
        return new InvalidUserCredentialsException("Invalid username or password");
    }
}
