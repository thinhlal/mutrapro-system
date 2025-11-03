package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi email đã được verify rồi
 */
public class EmailAlreadyVerifiedException extends BusinessException {
    
    public EmailAlreadyVerifiedException(String message) {
        super(IdentityServiceErrorCodes.EMAIL_ALREADY_VERIFIED, message);
    }
    
    public static EmailAlreadyVerifiedException create() {
        return new EmailAlreadyVerifiedException("Email already verified");
    }
}

