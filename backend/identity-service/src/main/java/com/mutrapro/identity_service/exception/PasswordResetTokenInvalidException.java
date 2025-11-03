package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi password reset token không hợp lệ
 */
public class PasswordResetTokenInvalidException extends BusinessException {
    
    public PasswordResetTokenInvalidException(String message) {
        super(IdentityServiceErrorCodes.PASSWORD_RESET_TOKEN_INVALID, message);
    }
    
    public static PasswordResetTokenInvalidException create() {
        return new PasswordResetTokenInvalidException("Invalid password reset token");
    }
}

