package com.mutrapro.shared.exception;

/**
 * Common error codes cho toàn bộ hệ thống
 * Các service cụ thể có thể tạo enum riêng extend từ đây
 */
public enum CommonErrorCodes implements ErrorCode {
    
    // Common Errors (1000-1999)
    INTERNAL_SERVER_ERROR("ERR_1000", 500, 
        "https://docs.mutrapro.com/errors/ERR_1000",
        "Internal server error", Retryable.NON_TRANSIENT),
    
    VALIDATION_ERROR("ERR_1001", 400,
        "https://docs.mutrapro.com/errors/ERR_1001", 
        "Validation error", Retryable.NON_TRANSIENT),
    
    RESOURCE_NOT_FOUND("ERR_1002", 404,
        "https://docs.mutrapro.com/errors/ERR_1002",
        "Resource not found", Retryable.NON_TRANSIENT),
    
    UNAUTHORIZED("ERR_1003", 401,
        "https://docs.mutrapro.com/errors/ERR_1003",
        "Unauthorized access", Retryable.NON_TRANSIENT),
    
    FORBIDDEN("ERR_1004", 403,
        "https://docs.mutrapro.com/errors/ERR_1004",
        "Access forbidden", Retryable.NON_TRANSIENT),
    
    CONFLICT("ERR_1005", 409,
        "https://docs.mutrapro.com/errors/ERR_1005",
        "Resource conflict", Retryable.NON_TRANSIENT),
    
    SERVICE_UNAVAILABLE("ERR_1006", 503,
        "https://docs.mutrapro.com/errors/ERR_1006",
        "Service unavailable", Retryable.TRANSIENT, 30),
    
    TIMEOUT("ERR_1007", 504,
        "https://docs.mutrapro.com/errors/ERR_1007",
        "Request timeout", Retryable.TRANSIENT, 10),
    
    CIRCUIT_BREAKER_OPEN("ERR_1008", 503,
        "https://docs.mutrapro.com/errors/ERR_1008",
        "Circuit breaker is open", Retryable.TRANSIENT, 60),
    
    // Database Errors (2000-2999)
    DATABASE_CONNECTION_ERROR("ERR_2000", 503,
        "https://docs.mutrapro.com/errors/ERR_2000",
        "Database connection error", Retryable.TRANSIENT, 15),
    
    DATABASE_CONSTRAINT_VIOLATION("ERR_2001", 400,
        "https://docs.mutrapro.com/errors/ERR_2001",
        "Database constraint violation", Retryable.NON_TRANSIENT),
    
    DATABASE_TIMEOUT("ERR_2002", 504,
        "https://docs.mutrapro.com/errors/ERR_2002",
        "Database operation timeout", Retryable.TRANSIENT, 20),
    
    DATABASE_TRANSACTION_ERROR("ERR_2003", 500,
        "https://docs.mutrapro.com/errors/ERR_2003",
        "Database transaction error", Retryable.TRANSIENT, 10),
    
    // Network Errors (3000-3099)
    NETWORK_CONNECTION_ERROR("ERR_3000", 503,
        "https://docs.mutrapro.com/errors/ERR_3000",
        "Network connection error", Retryable.TRANSIENT, 15),
    
    NETWORK_TIMEOUT("ERR_3001", 504,
        "https://docs.mutrapro.com/errors/ERR_3001",
        "Network timeout", Retryable.TRANSIENT, 10),
    
    NETWORK_UNREACHABLE("ERR_3002", 503,
        "https://docs.mutrapro.com/errors/ERR_3002",
        "Network unreachable", Retryable.TRANSIENT, 30);
    
    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;
    
    CommonErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }
    
    CommonErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
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
