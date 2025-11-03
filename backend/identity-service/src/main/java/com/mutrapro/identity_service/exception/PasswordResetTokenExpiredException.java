package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi password reset token đã hết hạn
 */
public class PasswordResetTokenExpiredException extends BusinessException {
    
    public PasswordResetTokenExpiredException(String message) {
        super(IdentityServiceErrorCodes.PASSWORD_RESET_TOKEN_EXPIRED, message);
    }
    
    public static PasswordResetTokenExpiredException create() {
        return new PasswordResetTokenExpiredException("Password reset token has expired");
    }
}

