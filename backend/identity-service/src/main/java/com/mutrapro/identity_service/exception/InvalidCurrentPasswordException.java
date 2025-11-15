package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

public class InvalidCurrentPasswordException extends BusinessException {
    public InvalidCurrentPasswordException() {
        super(IdentityServiceErrorCodes.INVALID_CURRENT_PASSWORD, "Current password is incorrect");
    }
}
