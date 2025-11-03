package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

/**
 * Exception khi password quá yếu
 */
public class WeakPasswordException extends BusinessException {
    
    public WeakPasswordException(String message) {
        super(IdentityServiceErrorCodes.WEAK_PASSWORD, message);
    }
    
    public static WeakPasswordException create() {
        return new WeakPasswordException("Password must be at least 8 characters with uppercase, lowercase, number and special character");
    }
    
    public static WeakPasswordException atLeast(int length) {
        return new WeakPasswordException("Password must be at least " + length + " characters long");
    }
    
    public static WeakPasswordException doNotMatch() {
        return new WeakPasswordException("Passwords do not match");
    }
}

