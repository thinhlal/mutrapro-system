package com.mutrapro.shared.util;

import com.mutrapro.shared.exception.*;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.util.concurrent.TimeoutException;
import java.util.Map;

/**
 * Utility class cho việc xử lý exception trong microservice
 * Không phụ thuộc vào Spring để có thể sử dụng trong shared library
 */
@Slf4j
@UtilityClass
public class ExceptionUtils {
    
    /**
     * Wrap database exception thành MicroserviceException
     * Lưu ý: Không sử dụng Spring exceptions trực tiếp để tránh dependency
     */
    public static MicroserviceException wrapDatabaseException(Exception ex, String operation) {
        log.error("Database error during {}: {}", operation, ex.getMessage(), ex);
        
        String message = ex.getMessage();
        if (message != null && message.toLowerCase().contains("timeout")) {
            return new TimeoutException(
                CommonErrorCodes.DATABASE_TIMEOUT,
                "Database operation timeout",
                "database",
                30000 // 30 seconds default timeout
            );
        }
        
        if (message != null && (message.toLowerCase().contains("constraint") || 
                               message.toLowerCase().contains("violation") ||
                               message.toLowerCase().contains("duplicate"))) {
            return new BusinessException(
                CommonErrorCodes.DATABASE_CONSTRAINT_VIOLATION,
                "Data integrity violation",
                "details", message
            );
        }
        
        if (message != null && message.toLowerCase().contains("transaction")) {
            return new BusinessException(
                CommonErrorCodes.DATABASE_TRANSACTION_ERROR,
                "Database transaction error",
                "details", message
            );
        }
        
        return new BusinessException(
            CommonErrorCodes.DATABASE_CONNECTION_ERROR,
            "Database operation failed",
            "details", message
        );
    }
    
    /**
     * Wrap network exception thành MicroserviceException
     */
    public static MicroserviceException wrapNetworkException(Exception ex, String serviceName) {
        log.error("Network error when calling service {}: {}", serviceName, ex.getMessage(), ex);
        
        if (ex instanceof ConnectException) {
            return new ServiceUnavailableException(
                CommonErrorCodes.NETWORK_CONNECTION_ERROR,
                "Service connection failed",
                serviceName
            );
        }
        
        if (ex instanceof SocketTimeoutException || ex instanceof TimeoutException) {
            return new TimeoutException(
                CommonErrorCodes.NETWORK_TIMEOUT,
                "Service call timeout",
                serviceName,
                30000 // 30 seconds default timeout
            );
        }
        
        return new ServiceUnavailableException(
            CommonErrorCodes.SERVICE_UNAVAILABLE,
            "Service call failed",
            serviceName
        );
    }
    
    /**
     * Tạo CircuitBreakerException
     */
    public static CircuitBreakerException createCircuitBreakerException(String serviceName) {
        return new CircuitBreakerException(
            CommonErrorCodes.CIRCUIT_BREAKER_OPEN,
            "Circuit breaker is open",
            serviceName
        );
    }
    
    /**
     * Tạo RetryableException
     */
    public static RetryableException createRetryableException(String serviceName, long retryAfterSeconds) {
        return new RetryableException(
            CommonErrorCodes.SERVICE_UNAVAILABLE,
            "Service temporarily unavailable",
            serviceName
        );
    }
    
    /**
     * Kiểm tra xem exception có thể retry được không
     */
    public static boolean isRetryable(Exception ex) {
        if (ex instanceof MicroserviceException) {
            return ((MicroserviceException) ex).canRetry();
        }
        
        if (ex instanceof SocketTimeoutException || ex instanceof TimeoutException) {
            return true;
        }
        
        if (ex instanceof ConnectException) {
            return true;
        }
        
        // Không retry cho business logic errors
        if (ex instanceof BusinessException || ex instanceof ValidationException) {
            return false;
        }
        
        // Không retry cho authentication/authorization errors
        if (ex instanceof UnauthorizedException || ex instanceof ForbiddenException) {
            return false;
        }
        
        // Không retry cho resource not found
        if (ex instanceof ResourceNotFoundException) {
            return false;
        }
        
        return false;
    }
    
    /**
     * Lấy retry delay từ exception
     */
    public static long getRetryDelay(Exception ex) {
        if (ex instanceof MicroserviceException) {
            return ((MicroserviceException) ex).getRetryAfterSeconds();
        }
        
        // Default retry delays based on exception type
        if (ex instanceof SocketTimeoutException || ex instanceof TimeoutException) {
            return 5; // 5 seconds for timeout
        }
        
        if (ex instanceof ConnectException) {
            return 10; // 10 seconds for connection issues
        }
        
        return 30; // Default 30 seconds
    }
    
    /**
     * Extract root cause từ exception chain
     */
    public static Throwable getRootCause(Throwable ex) {
        Throwable rootCause = ex;
        while (rootCause.getCause() != null && rootCause.getCause() != rootCause) {
            rootCause = rootCause.getCause();
        }
        return rootCause;
    }
    
    /**
     * Tạo error message từ exception
     */
    public static String createErrorMessage(String operation, Exception ex) {
        String rootCauseMessage = getRootCause(ex).getMessage();
        return String.format("Error during %s: %s", operation, 
            rootCauseMessage != null ? rootCauseMessage : ex.getMessage());
    }
    
    /**
     * Tạo BusinessException với details Map
     */
    public static BusinessException createBusinessException(ErrorCode errorCode, String message, Map<String, Object> details) {
        return new BusinessException(errorCode, message, details);
    }
    
    /**
     * Tạo BusinessException với single detail
     */
    public static BusinessException createBusinessException(ErrorCode errorCode, String message, String detailKey, Object detailValue) {
        return new BusinessException(errorCode, message, detailKey, detailValue);
    }
    
    /**
     * Tạo ResourceNotFoundException với details Map
     */
    public static ResourceNotFoundException createResourceNotFoundException(ErrorCode errorCode, String message, Map<String, Object> details) {
        return new ResourceNotFoundException(errorCode, message, details);
    }
    
    /**
     * Tạo ResourceNotFoundException với single detail
     */
    public static ResourceNotFoundException createResourceNotFoundException(ErrorCode errorCode, String message, String detailKey, Object detailValue) {
        return new ResourceNotFoundException(errorCode, message, detailKey, detailValue);
    }
}