package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

public class PasswordMismatchException extends BusinessException {
    public PasswordMismatchException() {
        super(IdentityServiceErrorCodes.PASSWORD_MISMATCH, "New password and confirm password do not match");
    }
}
