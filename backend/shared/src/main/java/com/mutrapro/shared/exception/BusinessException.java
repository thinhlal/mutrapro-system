package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Exception cho các lỗi business logic
 * HTTP Status: 400 Bad Request (default)
 */
public class BusinessException extends MicroserviceException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    public BusinessException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
    
    public BusinessException(ErrorCode errorCode, String message, Map<String, Object> details) {
        super(errorCode, message, details);
    }
    
    public BusinessException(ErrorCode errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
    }
    
    public BusinessException(ErrorCode errorCode, String message, Map<String, Object> details, Throwable cause) {
        super(errorCode, message, details, cause);
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public BusinessException(ErrorCode errorCode, String message, String detailKey, Object detailValue) {
        super(errorCode, message, detailKey, detailValue);
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public BusinessException(ErrorCode errorCode, String message, String detailKey, Object detailValue, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, cause);
    }
}
