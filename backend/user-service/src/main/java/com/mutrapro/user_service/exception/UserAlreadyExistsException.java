package com.mutrapro.user_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.user_service.enums.UserServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi User đã tồn tại
 */
public class UserAlreadyExistsException extends BusinessException {
    
    public UserAlreadyExistsException(String message) {
        super(UserServiceErrorCodes.USER_ALREADY_EXISTS, message);
    }
    
    public UserAlreadyExistsException(String message, String key, Object value) {
        super(UserServiceErrorCodes.USER_ALREADY_EXISTS, message, key, value);
    }
    
    public UserAlreadyExistsException(String message, Map<String, Object> details) {
        super(UserServiceErrorCodes.USER_ALREADY_EXISTS, message, details);
    }
    
    public static UserAlreadyExistsException withEmail(String email) {
        return new UserAlreadyExistsException(
            "User already exists with email: " + email,
            "email", email
        );
    }
    
    public static UserAlreadyExistsException withUsername(String username) {
        return new UserAlreadyExistsException(
            "User already exists with username: " + username,
            "username", username
        );
    }
}
