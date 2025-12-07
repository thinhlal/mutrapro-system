package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.MicroserviceException;

import java.util.Map;

/**
 * Exception khi không thể update user role trong identity-service
 * Đây là transient error, có thể retry
 */
public class UserRoleUpdateException extends MicroserviceException {
    
    public UserRoleUpdateException(String message) {
        super(SpecialistServiceErrorCodes.USER_ROLE_UPDATE_FAILED, message);
    }
    
    public UserRoleUpdateException(String message, Throwable cause) {
        super(SpecialistServiceErrorCodes.USER_ROLE_UPDATE_FAILED, message, cause);
    }
    
    public UserRoleUpdateException(String message, String userId, Throwable cause) {
        super(SpecialistServiceErrorCodes.USER_ROLE_UPDATE_FAILED, message, 
              Map.of("userId", userId != null ? userId : "unknown"), cause);
    }
    
    public static UserRoleUpdateException failed(String userId, Throwable cause) {
        return new UserRoleUpdateException(
            "Failed to update user role for user ID: " + userId,
            userId,
            cause
        );
    }
}

