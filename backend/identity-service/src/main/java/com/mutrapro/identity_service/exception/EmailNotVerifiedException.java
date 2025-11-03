package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi email chưa được verify
 */
public class EmailNotVerifiedException extends BusinessException {
    
    public EmailNotVerifiedException(String message) {
        super(IdentityServiceErrorCodes.USER_EMAIL_NOT_VERIFIED, message);
    }
    
    public static EmailNotVerifiedException create() {
        return new EmailNotVerifiedException("Email not verified. Please verify your email before logging in");
    }
}

