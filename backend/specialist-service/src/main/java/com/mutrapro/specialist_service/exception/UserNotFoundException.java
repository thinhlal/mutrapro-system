package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy user trong identity-service
 */
public class UserNotFoundException extends ResourceNotFoundException {
    
    public UserNotFoundException(String message) {
        super(SpecialistServiceErrorCodes.USER_NOT_FOUND, message);
    }
    
    public UserNotFoundException(String message, String email) {
        super(SpecialistServiceErrorCodes.USER_NOT_FOUND, message, 
              Map.of("email", email != null ? email : "unknown"));
    }
    
    public UserNotFoundException(String message, Throwable cause) {
        super(SpecialistServiceErrorCodes.USER_NOT_FOUND, message, cause);
    }
    
    public UserNotFoundException(String message, String email, Throwable cause) {
        super(SpecialistServiceErrorCodes.USER_NOT_FOUND, message, 
              Map.of("email", email != null ? email : "unknown"), cause);
    }
    
    public static UserNotFoundException byEmail(String email) {
        return new UserNotFoundException(
            "User not found with email: " + email,
            email
        );
    }
    
    public static UserNotFoundException byEmail(String email, Throwable cause) {
        return new UserNotFoundException(
            "User not found with email: " + email,
            email,
            cause
        );
    }
}

