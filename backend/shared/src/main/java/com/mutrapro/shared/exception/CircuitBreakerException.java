package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Exception cho trường hợp Circuit Breaker mở
 * HTTP Status: 503 Service Unavailable (default)
 */
public class CircuitBreakerException extends ServiceUnavailableException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    public CircuitBreakerException(ErrorCode errorCode, String message, String serviceName) {
        super(errorCode, message, serviceName);
    }
    
    public CircuitBreakerException(ErrorCode errorCode, String message, Map<String, Object> details, String serviceName) {
        super(errorCode, message, details, serviceName);
    }
    
    public CircuitBreakerException(ErrorCode errorCode, String message, String serviceName, Throwable cause) {
        super(errorCode, message, serviceName, cause);
    }
    
    public CircuitBreakerException(ErrorCode errorCode, String message, Map<String, Object> details, 
                                String serviceName, Throwable cause) {
        super(errorCode, message, details, serviceName, cause);
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public CircuitBreakerException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName) {
        super(errorCode, message, detailKey, detailValue, serviceName);
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public CircuitBreakerException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, serviceName, cause);
    }
}
