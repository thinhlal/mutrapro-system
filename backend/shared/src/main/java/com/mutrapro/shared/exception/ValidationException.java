package com.mutrapro.shared.exception;

import com.mutrapro.shared.dto.ApiResponse;
import lombok.Getter;

import java.io.Serial;
import java.util.List;
import java.util.Map;

/**
 * Exception cho validation errors
 * HTTP Status: 422 Unprocessable Entity (default)
 */
@Getter
public class ValidationException extends MicroserviceException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final List<ApiResponse.ValidationError> validationErrors;
    
    public ValidationException(ErrorCode errorCode, String message) {
        super(errorCode, message);
        this.validationErrors = null;
    }
    
    public ValidationException(ErrorCode errorCode, String message, Map<String, Object> details) {
        super(errorCode, message, details);
        this.validationErrors = null;
    }
    
    public ValidationException(ErrorCode errorCode, String message, List<ApiResponse.ValidationError> validationErrors) {
        super(errorCode, message);
        this.validationErrors = validationErrors;
    }
    
    public ValidationException(ErrorCode errorCode, String message, Map<String, Object> details, 
                             List<ApiResponse.ValidationError> validationErrors) {
        super(errorCode, message, details);
        this.validationErrors = validationErrors;
    }
    
    public ValidationException(ErrorCode errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
        this.validationErrors = null;
    }
    
    public ValidationException(ErrorCode errorCode, String message, Map<String, Object> details, Throwable cause) {
        super(errorCode, message, details, cause);
        this.validationErrors = null;
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public ValidationException(ErrorCode errorCode, String message, String detailKey, Object detailValue) {
        super(errorCode, message, detailKey, detailValue);
        this.validationErrors = null;
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public ValidationException(ErrorCode errorCode, String message, String detailKey, Object detailValue, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, cause);
        this.validationErrors = null;
    }
}
