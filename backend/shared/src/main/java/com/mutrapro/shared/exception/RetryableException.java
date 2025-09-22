package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Exception cho các lỗi có thể retry
 * HTTP Status: 503 Service Unavailable (default)
 * Lưu ý: RetryableException sử dụng Retryable enum từ ErrorCode thay vì boolean riêng
 */
public class RetryableException extends ServiceUnavailableException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    public RetryableException(ErrorCode errorCode, String message, String serviceName) {
        super(errorCode, message, serviceName);
    }
    
    public RetryableException(ErrorCode errorCode, String message, Map<String, Object> details, String serviceName) {
        super(errorCode, message, details, serviceName);
    }
    
    public RetryableException(ErrorCode errorCode, String message, String serviceName, Throwable cause) {
        super(errorCode, message, serviceName, cause);
    }
    
    public RetryableException(ErrorCode errorCode, String message, Map<String, Object> details, 
                           String serviceName, Throwable cause) {
        super(errorCode, message, details, serviceName, cause);
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public RetryableException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName) {
        super(errorCode, message, detailKey, detailValue, serviceName);
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public RetryableException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, serviceName, cause);
    }
    
    /**
     * Kiểm tra xem có thể retry được không
     */
    public boolean isRetryable() {
        return getRetryable().canRetry();
    }
    
    /**
     * Lấy retry after seconds từ ErrorCode
     */
    public long getRetryAfterSeconds() {
        return getRetryable().canRetry() ? super.getRetryAfterSeconds() : 0;
    }
}
