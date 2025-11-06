package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.UnauthorizedException;

/**
 * Exception khi user chưa được authenticate
 */
public class UserNotAuthenticatedException extends UnauthorizedException {

    public UserNotAuthenticatedException(String message) {
        super(RequestServiceErrorCodes.USER_NOT_AUTHENTICATED, message);
    }

    public static UserNotAuthenticatedException create() {
        return new UserNotAuthenticatedException("User not authenticated");
    }
}

