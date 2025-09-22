package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Exception cho timeout errors
 * HTTP Status: 504 Gateway Timeout (default)
 */
public class TimeoutException extends ServiceUnavailableException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final long timeoutDurationMs;
    
    public TimeoutException(ErrorCode errorCode, String message, String serviceName) {
        super(errorCode, message, serviceName);
        this.timeoutDurationMs = 0;
    }
    
    public TimeoutException(ErrorCode errorCode, String message, Map<String, Object> details, String serviceName) {
        super(errorCode, message, details, serviceName);
        this.timeoutDurationMs = 0;
    }
    
    public TimeoutException(ErrorCode errorCode, String message, String serviceName, long timeoutDurationMs) {
        super(errorCode, message, serviceName);
        this.timeoutDurationMs = timeoutDurationMs;
    }
    
    public TimeoutException(ErrorCode errorCode, String message, Map<String, Object> details, 
                         String serviceName, long timeoutDurationMs) {
        super(errorCode, message, details, serviceName);
        this.timeoutDurationMs = timeoutDurationMs;
    }
    
    public TimeoutException(ErrorCode errorCode, String message, String serviceName, Throwable cause) {
        super(errorCode, message, serviceName, cause);
        this.timeoutDurationMs = 0;
    }
    
    public TimeoutException(ErrorCode errorCode, String message, Map<String, Object> details, 
                         String serviceName, long timeoutDurationMs, Throwable cause) {
        super(errorCode, message, details, serviceName, cause);
        this.timeoutDurationMs = timeoutDurationMs;
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public TimeoutException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName) {
        super(errorCode, message, detailKey, detailValue, serviceName);
        this.timeoutDurationMs = 0;
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public TimeoutException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, serviceName, cause);
        this.timeoutDurationMs = 0;
    }
    
    public long getTimeoutDurationMs() {
        return timeoutDurationMs;
    }
}
