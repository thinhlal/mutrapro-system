package com.mutrapro.identity_service.exception;

import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi verification code đã hết hạn
 */
public class VerificationCodeExpiredException extends BusinessException {
    
    public VerificationCodeExpiredException(String message) {
        super(IdentityServiceErrorCodes.VERIFICATION_CODE_EXPIRED, message);
    }
    
    public static VerificationCodeExpiredException create() {
        return new VerificationCodeExpiredException("Verification code has expired");
    }
}

