package com.mutrapro.identity_service.exception;

import com.mutrapro.shared.exception.ValidationException;
import com.mutrapro.identity_service.enums.IdentityServiceErrorCodes;

import java.util.Map;

/**
 * Exception khi email format không hợp lệ
 */
public class InvalidEmailFormatException extends ValidationException {
    
    public InvalidEmailFormatException(String message) {
        super(IdentityServiceErrorCodes.INVALID_EMAIL_FORMAT, message);
    }
    
    public InvalidEmailFormatException(String message, String key, Object value) {
        super(IdentityServiceErrorCodes.INVALID_EMAIL_FORMAT, message, key, value);
    }
    
    public InvalidEmailFormatException(String message, Map<String, Object> details) {
        super(IdentityServiceErrorCodes.INVALID_EMAIL_FORMAT, message, details);
    }
    
    public static InvalidEmailFormatException withEmail(String email) {
        return new InvalidEmailFormatException(
            "Invalid email format: " + email,
            "email", email
        );
    }
}

