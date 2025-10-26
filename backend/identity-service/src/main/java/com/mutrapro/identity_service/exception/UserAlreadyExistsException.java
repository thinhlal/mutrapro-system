package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

public class UserAlreadyExistsException extends BusinessException {
    private UserAlreadyExistsException(String message) {
        super(IdentityServiceErrorCodes.USER_ALREADY_EXISTS, message);
    }

    public static UserAlreadyExistsException create() {
        return new UserAlreadyExistsException("User already exists with this email");
    }
}

