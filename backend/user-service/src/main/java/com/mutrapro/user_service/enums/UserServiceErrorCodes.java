package com.mutrapro.user_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * User Service Error Codes - Chỉ chứa các error codes riêng của User Service
 * Range: 4000-4099
 */
public enum UserServiceErrorCodes implements ErrorCode {
    
    // User Service Errors (4000-4099)
    USER_NOT_FOUND("USER_4000", 404,
        "https://docs.mutrapro.com/errors/USER_4000",
        "The requested user does not exist",
        Retryable.NON_TRANSIENT),
    
    USER_ALREADY_EXISTS("USER_4001", 409,
        "https://docs.mutrapro.com/errors/USER_4001",
        "A user with this information already exists",
        Retryable.NON_TRANSIENT),
    
    INVALID_USER_CREDENTIALS("USER_4002", 401,
        "https://docs.mutrapro.com/errors/USER_4002",
        "The provided credentials are invalid",
        Retryable.NON_TRANSIENT),
    
    USER_ACCOUNT_DISABLED("USER_4003", 403,
        "https://docs.mutrapro.com/errors/USER_4003",
        "This user account has been disabled",
        Retryable.NON_TRANSIENT),
    
    USER_ACCOUNT_LOCKED("USER_4004", 423,
        "https://docs.mutrapro.com/errors/USER_4004",
        "This user account has been locked",
        Retryable.NON_TRANSIENT),
    
    INVALID_EMAIL_FORMAT("USER_4005", 400,
        "https://docs.mutrapro.com/errors/USER_4005",
        "The provided email format is invalid",
        Retryable.NON_TRANSIENT),
    
    WEAK_PASSWORD("USER_4006", 400,
        "https://docs.mutrapro.com/errors/USER_4006",
        "Password must be at least 8 characters with uppercase, lowercase, number and special character",
        Retryable.NON_TRANSIENT),
    
    EMAIL_VERIFICATION_REQUIRED("USER_4007", 403,
        "https://docs.mutrapro.com/errors/USER_4007",
        "Please verify your email address before proceeding",
        Retryable.NON_TRANSIENT),
    
    PASSWORD_RESET_TOKEN_EXPIRED("USER_4008", 400,
        "https://docs.mutrapro.com/errors/USER_4008",
        "The password reset token has expired",
        Retryable.NON_TRANSIENT),
    
    USER_PROFILE_INCOMPLETE("USER_4009", 400,
        "https://docs.mutrapro.com/errors/USER_4009",
        "Please complete your profile before proceeding",
        Retryable.NON_TRANSIENT),
    
    USER_ROLE_INVALID("USER_4010", 400,
        "https://docs.mutrapro.com/errors/USER_4010",
        "The specified user role is invalid",
        Retryable.NON_TRANSIENT),
    
    USER_PERMISSION_DENIED("USER_4011", 403,
        "https://docs.mutrapro.com/errors/USER_4011",
        "User does not have permission to perform this action",
        Retryable.NON_TRANSIENT),
    
    USER_SESSION_EXPIRED("USER_4012", 401,
        "https://docs.mutrapro.com/errors/USER_4012",
        "The user session has expired",
        Retryable.NON_TRANSIENT),
    
    USER_EMAIL_NOT_VERIFIED("USER_4013", 403,
        "https://docs.mutrapro.com/errors/USER_4013",
        "User email address is not verified",
        Retryable.NON_TRANSIENT),
    
    USER_PHONE_NOT_VERIFIED("USER_4014", 403,
        "https://docs.mutrapro.com/errors/USER_4014",
        "User phone number is not verified",
        Retryable.NON_TRANSIENT),
    
    USER_TWO_FACTOR_REQUIRED("ERR_4015", 403,
        "https://docs.mutrapro.com/errors/ERR_4015",
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
