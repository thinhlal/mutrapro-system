package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.ResourceNotFoundException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi không tìm thấy User
 */
public class UserNotFoundException extends ResourceNotFoundException {
    
    public UserNotFoundException(String message) {
        super(IdentityServiceErrorCodes.USER_NOT_FOUND, message);
    }
    
    public UserNotFoundException(String message, String key, Object value) {
        super(IdentityServiceErrorCodes.USER_NOT_FOUND, message, key, value);
    }
    
    public UserNotFoundException(String message, Map<String, Object> details) {
        super(IdentityServiceErrorCodes.USER_NOT_FOUND, message, details);
    }
    
    public static UserNotFoundException byId(String id) {
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
}

