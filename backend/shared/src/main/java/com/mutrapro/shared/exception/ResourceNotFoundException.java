package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Exception cho trường hợp không tìm thấy resource
 * HTTP Status: 404 Not Found (default)
 */
public class ResourceNotFoundException extends MicroserviceException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    public ResourceNotFoundException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
    
    public ResourceNotFoundException(ErrorCode errorCode, String message, Map<String, Object> details) {
        super(errorCode, message, details);
    }
    
    public ResourceNotFoundException(ErrorCode errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
    }
    
    public ResourceNotFoundException(ErrorCode errorCode, String message, Map<String, Object> details, Throwable cause) {
        super(errorCode, message, details, cause);
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public ResourceNotFoundException(ErrorCode errorCode, String message, String detailKey, Object detailValue) {
        super(errorCode, message, detailKey, detailValue);
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public ResourceNotFoundException(ErrorCode errorCode, String message, String detailKey, Object detailValue, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, cause);
    }
}
