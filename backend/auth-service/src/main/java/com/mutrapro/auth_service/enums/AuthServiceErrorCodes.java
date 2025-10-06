package com.mutrapro.auth_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * Auth Service Error Codes - Chỉ chứa các error codes riêng của Auth Service
 * Range: 5000-5099
 */
public enum AuthServiceErrorCodes implements ErrorCode {

    // Auth Service Errors (5000-5099)
    TOKEN_GENERATION_FAILED("AUTH_5000", 500,
        "https://docs.mutrapro.com/errors/AUTH_5000",
        "Failed to generate authentication token",
        Retryable.NON_TRANSIENT),

    INVALID_SIGNING_KEY("AUTH_5001", 500,
        "https://docs.mutrapro.com/errors/AUTH_5001",
        "Configured signing key is invalid or incompatible",
        Retryable.NON_TRANSIENT),

    UNSUPPORTED_JWT_ALGORITHM("AUTH_5002", 400,
        "https://docs.mutrapro.com/errors/AUTH_5002",
        "The specified JWT algorithm is not supported",
        Retryable.NON_TRANSIENT),

    JWT_SIGNING_FAILED("AUTH_5003", 500,
        "https://docs.mutrapro.com/errors/AUTH_5003",
        "An error occurred while signing JWT token",
        Retryable.NON_TRANSIENT),

    JWT_VERIFICATION_FAILED("AUTH_5004", 401,
        "https://docs.mutrapro.com/errors/AUTH_5004",
        "Failed to verify JWT token signature or claims",
        Retryable.NON_TRANSIENT),

    TOKEN_EXPIRED("AUTH_5005", 401,
        "https://docs.mutrapro.com/errors/AUTH_5005",
        "The authentication token has expired",
        Retryable.NON_TRANSIENT),

    TOKEN_INVALID("AUTH_5006", 401,
        "https://docs.mutrapro.com/errors/AUTH_5006",
        "The authentication token is invalid",
        Retryable.NON_TRANSIENT),

    TOKEN_MALFORMED("AUTH_5007", 400,
        "https://docs.mutrapro.com/errors/AUTH_5007",
        "The authentication token format is malformed",
        Retryable.NON_TRANSIENT),

    TOKEN_BLACKLISTED("AUTH_5008", 403,
        "https://docs.mutrapro.com/errors/AUTH_5008",
        "The authentication token has been revoked or blacklisted",
        Retryable.NON_TRANSIENT),

    REFRESH_TOKEN_EXPIRED("AUTH_5009", 401,
        "https://docs.mutrapro.com/errors/AUTH_5009",
        "The refresh token has expired",
        Retryable.NON_TRANSIENT),

    USER_NOT_FOUND("AUTH_5010", 404,
        "https://docs.mutrapro.com/errors/AUTH_5010",
        "User not found",
        Retryable.NON_TRANSIENT),

    USER_DISABLED("AUTH_5011", 403,
        "https://docs.mutrapro.com/errors/AUTH_5011",
        "User disabled",
        Retryable.NON_TRANSIENT),

    INVALID_CREDENTIALS("AUTH_5012", 401,
        "https://docs.mutrapro.com/errors/AUTH_5012",
        "Invalid credentials",
        Retryable.NON_TRANSIENT),

    USER_ALREADY_EXISTS("AUTH_5013", 409,
        "https://docs.mutrapro.com/errors/AUTH_5013",
        "User already exists",
        Retryable.NON_TRANSIENT);

    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;

    AuthServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }

    AuthServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
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
