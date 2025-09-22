package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Base exception class cho toàn bộ microservice system
 * Tất cả custom exceptions nên extends từ class này
 */
public abstract class MicroserviceException extends RuntimeException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final ErrorCode errorCode;
    private final Map<String, Object> details;
    
    /**
     * Constructor với ErrorCode
     */
    public MicroserviceException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.details = null;
    }
    
    /**
     * Constructor với ErrorCode và details Map
     */
    public MicroserviceException(ErrorCode errorCode, String message, Map<String, Object> details) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
    }
    
    /**
     * Constructor với ErrorCode và cause
     */
    public MicroserviceException(ErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.details = null;
    }
    
    /**
     * Constructor với ErrorCode, details Map và cause
     */
    public MicroserviceException(ErrorCode errorCode, String message, Map<String, Object> details, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.details = details;
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public MicroserviceException(ErrorCode errorCode, String message, String detailKey, Object detailValue) {
        super(message);
        this.errorCode = errorCode;
        this.details = Map.of(detailKey, detailValue);
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public MicroserviceException(ErrorCode errorCode, String message, String detailKey, Object detailValue, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.details = Map.of(detailKey, detailValue);
    }
    
    public ErrorCode getErrorCode() {
        return errorCode;
    }
    
    public String getErrorCodeString() {
        return errorCode.getCode();
    }
    
    public Map<String, Object> getDetails() {
        return details;
    }
    
    /**
     * Lấy HTTP status code từ ErrorCode
     */
    public int getHttpStatus() {
        return errorCode.getHttpStatus();
    }
    
    /**
     * Lấy retryable type từ ErrorCode
     */
    public Retryable getRetryable() {
        return errorCode.getRetryable();
    }
    
    /**
     * Lấy retry after seconds từ ErrorCode
     */
    public long getRetryAfterSeconds() {
        return errorCode.getRetryAfterSeconds();
    }
    
    /**
     * Lấy type URI từ ErrorCode
     */
    public String getType() {
        return errorCode.getType();
    }
    
    /**
     * Kiểm tra xem có thể retry được không
     */
    public boolean canRetry() {
        return getRetryable().canRetry();
    }
    
    /**
     * Kiểm tra xem chắc chắn không thể retry
     */
    public boolean cannotRetry() {
        return getRetryable().cannotRetry();
    }
}
