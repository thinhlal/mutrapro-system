package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Exception cho trường hợp bị cấm truy cập (không đủ quyền)
 * HTTP Status: 403 Forbidden (default)
 */
public class ForbiddenException extends MicroserviceException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    public ForbiddenException(ErrorCode errorCode, String message) {
        super(errorCode, message);
    }
    
    public ForbiddenException(ErrorCode errorCode, String message, Map<String, Object> details) {
        super(errorCode, message, details);
    }
    
    public ForbiddenException(ErrorCode errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
    }
    
    public ForbiddenException(ErrorCode errorCode, String message, Map<String, Object> details, Throwable cause) {
        super(errorCode, message, details, cause);
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public ForbiddenException(ErrorCode errorCode, String message, String detailKey, Object detailValue) {
        super(errorCode, message, detailKey, detailValue);
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public ForbiddenException(ErrorCode errorCode, String message, String detailKey, Object detailValue, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, cause);
    }
}
