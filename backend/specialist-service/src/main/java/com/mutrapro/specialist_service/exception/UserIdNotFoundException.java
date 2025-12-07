package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.UnauthorizedException;

/**
 * Exception khi không tìm thấy user ID trong JWT token
 */
public class UserIdNotFoundException extends UnauthorizedException {
    
    public UserIdNotFoundException(String message) {
        super(SpecialistServiceErrorCodes.USER_ID_NOT_FOUND, message);
    }
    
    public static UserIdNotFoundException create() {
        return new UserIdNotFoundException(
            "User ID not found in JWT token. Please ensure JWT contains 'userId' or 'sub' claim."
        );
    }
}

