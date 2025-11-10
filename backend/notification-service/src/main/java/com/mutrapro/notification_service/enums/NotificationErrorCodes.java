package com.mutrapro.notification_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * Error codes cho Notification Service
 */
public enum NotificationErrorCodes implements ErrorCode {
    
    // Notification errors (7000-7099)
    NOTIFICATION_NOT_FOUND("ERR_7001", 404, 
        "https://docs.mutrapro.com/errors/ERR_7001",
        "Notification not found", Retryable.NON_TRANSIENT),
    
    NOTIFICATION_ACCESS_DENIED("ERR_7002", 403,
        "https://docs.mutrapro.com/errors/ERR_7002",
        "Access denied to notification", Retryable.NON_TRANSIENT);
    
    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;
    
    NotificationErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }
    
    NotificationErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
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

