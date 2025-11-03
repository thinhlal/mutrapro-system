package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi verification code không hợp lệ
 */
public class VerificationCodeInvalidException extends BusinessException {
    
    public VerificationCodeInvalidException(String message) {
        super(IdentityServiceErrorCodes.VERIFICATION_CODE_INVALID, message);
    }
    
    public static VerificationCodeInvalidException create() {
        return new VerificationCodeInvalidException("Invalid verification code");
    }
}

