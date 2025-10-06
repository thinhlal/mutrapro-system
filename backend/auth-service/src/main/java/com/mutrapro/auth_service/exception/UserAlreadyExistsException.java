package com.mutrapro.auth_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.auth_service.enums.AuthServiceErrorCodes;

public class UserAlreadyExistsException extends BusinessException {
    private UserAlreadyExistsException(String message) {
        super(AuthServiceErrorCodes.USER_ALREADY_EXISTS, message);
    }

    public static UserAlreadyExistsException create() {
        return new UserAlreadyExistsException("User already exists with this email");
    }
}


