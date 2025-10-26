package com.mutrapro.identity_service.exception;

import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi ký JWT token thất bại
 */
public class JwtSigningFailedException extends BusinessException {

    public JwtSigningFailedException(String message) {
        super(IdentityServiceErrorCodes.JWT_SIGNING_FAILED, message);
    }

    public JwtSigningFailedException(String message, String key, Object value) {
        super(IdentityServiceErrorCodes.JWT_SIGNING_FAILED, message, key, value);
    }

    public JwtSigningFailedException(String message, Map<String, Object> details) {
        super(IdentityServiceErrorCodes.JWT_SIGNING_FAILED, message, details);
    }

    public JwtSigningFailedException(String message, Throwable cause) {
        super(IdentityServiceErrorCodes.JWT_SIGNING_FAILED, message, cause);
    }

    public JwtSigningFailedException(String message, String key, Object value, Throwable cause) {
        super(IdentityServiceErrorCodes.JWT_SIGNING_FAILED, message, key, value, cause);
    }

    public static JwtSigningFailedException fromCause(Throwable cause) {
        return new JwtSigningFailedException("Failed to sign JWT token", "cause", cause.getMessage(), cause);
    }
}

