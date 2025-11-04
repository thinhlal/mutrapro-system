package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi password đã được set
 */
public class PasswordAlreadySetException extends BusinessException {
    
    public PasswordAlreadySetException(String message) {
        super(IdentityServiceErrorCodes.PASSWORD_ALREADY_SET, message);
    }
    
    public static PasswordAlreadySetException create() {
        return new PasswordAlreadySetException("Password already set");
    }
}

