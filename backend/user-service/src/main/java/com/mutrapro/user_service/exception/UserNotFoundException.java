package com.mutrapro.user_service.exception;

import com.mutrapro.shared.exception.ResourceNotFoundException;
import com.mutrapro.user_service.enums.UserServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi không tìm thấy User
 */
public class UserNotFoundException extends ResourceNotFoundException {
    
    public UserNotFoundException(String message) {
        super(UserServiceErrorCodes.USER_NOT_FOUND, message);
    }
    
    public UserNotFoundException(String message, String key, Object value) {
        super(UserServiceErrorCodes.USER_NOT_FOUND, message, key, value);
    }
    
    public UserNotFoundException(String message, Map<String, Object> details) {
        super(UserServiceErrorCodes.USER_NOT_FOUND, message, details);
    }
    
    public static UserNotFoundException byId(Long id) {
        return new UserNotFoundException(
            "User not found with ID: " + id,
            "userId", id
        );
    }
    
    public static UserNotFoundException byEmail(String email) {
        return new UserNotFoundException(
            "User not found with email: " + email,
            "email", email
        );
    }
    
    public static UserNotFoundException byUsername(String username) {
        return new UserNotFoundException(
            "User not found with username: " + username,
            "username", username
        );
    }
}
