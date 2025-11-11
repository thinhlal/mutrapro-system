package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.UnauthorizedException;

/**
 * Exception khi user chưa được xác thực
 */
public class UserNotAuthenticatedException extends UnauthorizedException {

    public UserNotAuthenticatedException(String message) {
        super(ProjectServiceErrorCodes.USER_NOT_AUTHENTICATED, message);
    }

    public static UserNotAuthenticatedException create() {
        return new UserNotAuthenticatedException("User is not authenticated");
    }
}

