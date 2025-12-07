package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.UnauthorizedException;

/**
 * Exception khi user chưa được authenticate
 */
public class UserNotAuthenticatedException extends UnauthorizedException {
    
    public UserNotAuthenticatedException(String message) {
        super(SpecialistServiceErrorCodes.USER_NOT_AUTHENTICATED, message);
    }
    
    public static UserNotAuthenticatedException create() {
        return new UserNotAuthenticatedException("User not authenticated");
    }
}

