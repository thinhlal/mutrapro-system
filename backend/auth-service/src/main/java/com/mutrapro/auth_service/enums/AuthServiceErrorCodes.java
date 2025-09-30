package com.mutrapro.user_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * User Service Error Codes - Chỉ chứa các error codes riêng của User Service
 * Range: 4000-4099
 */
public enum UserServiceErrorCodes implements ErrorCode {
    
    // User Service Errors (4000-4099)
    USER_NOT_FOUND("ERR_4000", 404,
        "https://docs.mutrapro.com/errors/ERR_4000",
        "User not found", 
        "The requested user does not exist",
        Retryable.NON_TRANSIENT),
    
    USER_ALREADY_EXISTS("ERR_4001", 409,
        "https://docs.mutrapro.com/errors/ERR_4001",
        "User already exists", 
        "A user with this information already exists",
        Retryable.NON_TRANSIENT),
    
    INVALID_USER_CREDENTIALS("ERR_4002", 401,
        "https://docs.mutrapro.com/errors/ERR_4002",
        "Invalid user credentials", 
        "The provided credentials are invalid",
        Retryable.NON_TRANSIENT),
    
    USER_ACCOUNT_DISABLED("ERR_4003", 403,
        "https://docs.mutrapro.com/errors/ERR_4003",
        "User account disabled", 
        "This user account has been disabled",
        Retryable.NON_TRANSIENT),
    
    USER_ACCOUNT_LOCKED("ERR_4004", 423,
        "https://docs.mutrapro.com/errors/ERR_4004",
        "User account locked", 
        "This user account has been locked",
        Retryable.NON_TRANSIENT),
    
    INVALID_EMAIL_FORMAT("ERR_4005", 400,
        "https://docs.mutrapro.com/errors/ERR_4005",
        "Invalid email format", 
        "The provided email format is invalid",
        Retryable.NON_TRANSIENT),
    
    WEAK_PASSWORD("ERR_4006", 400,
        "https://docs.mutrapro.com/errors/ERR_4006",
        "Password does not meet requirements", 
        "Password must be at least 8 characters with uppercase, lowercase, number and special character",
        Retryable.NON_TRANSIENT),
    
    EMAIL_VERIFICATION_REQUIRED("ERR_4007", 403,
        "https://docs.mutrapro.com/errors/ERR_4007",
        "Email verification required", 
        "Please verify your email address before proceeding",
        Retryable.NON_TRANSIENT),
    
    PASSWORD_RESET_TOKEN_EXPIRED("ERR_4008", 400,
        "https://docs.mutrapro.com/errors/ERR_4008",
        "Password reset token expired", 
        "The password reset token has expired",
        Retryable.NON_TRANSIENT),
    
    USER_PROFILE_INCOMPLETE("ERR_4009", 400,
        "https://docs.mutrapro.com/errors/ERR_4009",
        "User profile incomplete", 
        "Please complete your profile before proceeding",
        Retryable.NON_TRANSIENT),
    
    USER_ROLE_INVALID("ERR_4010", 400,
        "https://docs.mutrapro.com/errors/ERR_4010",
        "Invalid user role", 
        "The specified user role is invalid",
        Retryable.NON_TRANSIENT),
    
    USER_PERMISSION_DENIED("ERR_4011", 403,
        "https://docs.mutrapro.com/errors/ERR_4011",
        "User permission denied", 
        "User does not have permission to perform this action",
        Retryable.NON_TRANSIENT),
    
    USER_SESSION_EXPIRED("ERR_4012", 401,
        "https://docs.mutrapro.com/errors/ERR_4012",
        "User session expired", 
        "The user session has expired",
        Retryable.NON_TRANSIENT),
    
    USER_EMAIL_NOT_VERIFIED("ERR_4013", 403,
        "https://docs.mutrapro.com/errors/ERR_4013",
        "User email not verified", 
        "User email address is not verified",
        Retryable.NON_TRANSIENT),
    
    USER_PHONE_NOT_VERIFIED("ERR_4014", 403,
        "https://docs.mutrapro.com/errors/ERR_4014",
        "User phone not verified", 
        "User phone number is not verified",
        Retryable.NON_TRANSIENT),
    
    USER_TWO_FACTOR_REQUIRED("ERR_4015", 403,
        "https://docs.mutrapro.com/errors/ERR_4015",
        "Two-factor authentication required", 
        "Two-factor authentication is required for this action",
        Retryable.NON_TRANSIENT);
    
    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;
    
    UserServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }
    
    UserServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.type = type;
        this.description = description;
        this.retryable = retryable;
        this.retryAfterSeconds = retryAfterSeconds;
    }
    
    @Override
    public String getCode() {
        return code;
    }
    
    @Override
    public int getHttpStatus() {
        return httpStatus;
    }
    
    @Override
    public String getType() {
        return type;
    }
    
    @Override
    public String getDescription() {
        return description;
    }
    
    @Override
    public Retryable getRetryable() {
        return retryable;
    }
    
    @Override
    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
