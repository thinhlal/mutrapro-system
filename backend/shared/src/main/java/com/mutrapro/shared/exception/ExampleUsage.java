package com.mutrapro.shared.exception;

import java.util.Map;

/**
 * Example usage của hệ thống exception handling mới
 * Demonstrates cách sử dụng ErrorCode interface và các improvements
 */
public class ExampleUsage {
    
    /**
     * Example 1: Sử dụng ErrorCode enum thay vì hardcode string
     */
    public void example1_UsingErrorCode() {
        // Thay vì:
        // throw new BusinessException("ERR_4001", "User already exists");
        
        // Sử dụng:
        throw new BusinessException(
            UserServiceErrorCodes.USER_ALREADY_EXISTS, 
            "User already exists with this email"
        );
    }
    
    /**
     * Example 2: Sử dụng details Map thay vì String
     */
    public void example2_UsingDetailsMap() {
        // Thay vì:
        // throw new ResourceNotFoundException("ERR_4000", "User not found", "User with ID 123 not found");
        
        // Sử dụng:
        Map<String, Object> details = Map.of(
            "userId", 123L,
            "field", "id",
            "value", "123"
        );
        
        throw new ResourceNotFoundException(
            UserServiceErrorCodes.USER_NOT_FOUND,
            "User not found",
            details
        );
    }
    
    /**
     * Example 3: Constructor tiện dụng với single detail
     */
    public void example3_ConvenientConstructor() {
        // Thay vì tạo Map:
        throw new BusinessException(
            UserServiceErrorCodes.INVALID_EMAIL_FORMAT,
            "Invalid email format",
            "email", "invalid-email-format"
        );
    }
    
    /**
     * Example 4: Retryable exception với ErrorCode
     */
    public void example4_RetryableException() {
        // ErrorCode tự động xác định retryable type
        throw new TimeoutException(
            CommonErrorCodes.NETWORK_TIMEOUT,
            "Service call timeout",
            "external-service"
        );
        
        // Exception này sẽ có:
        // - getRetryable() = Retryable.TRANSIENT
        // - getRetryAfterSeconds() = 10 (từ ErrorCode)
        // - canRetry() = true
    }
    
    /**
     * Example 5: Validation exception với structured details
     */
    public void example5_ValidationException() {
        Map<String, Object> details = Map.of(
            "field", "password",
            "constraint", "length",
            "minLength", 8,
            "actualLength", 5,
            "message", "Password must be at least 8 characters"
        );
        
        throw new ValidationException(
            UserServiceErrorCodes.WEAK_PASSWORD,
            "Password validation failed",
            details
        );
    }
    
    /**
     * Example 6: Service unavailable với service name
     */
    public void example6_ServiceUnavailable() {
        throw new ServiceUnavailableException(
            CommonErrorCodes.SERVICE_UNAVAILABLE,
            "Payment service is currently unavailable",
            "payment-service"
        );
    }
    
    /**
     * Example 7: Circuit breaker exception
     */
    public void example7_CircuitBreaker() {
        throw new CircuitBreakerException(
            CommonErrorCodes.CIRCUIT_BREAKER_OPEN,
            "Circuit breaker is open for user service",
            "user-service"
        );
    }
    
    /**
     * Example 8: Exception với cause
     */
    public void example8_ExceptionWithCause() {
        try {
            // Some operation that might fail
            performDatabaseOperation();
        } catch (Exception cause) {
            throw new BusinessException(
                CommonErrorCodes.DATABASE_CONNECTION_ERROR,
                "Failed to save user data",
                "database", "postgresql",
                cause
            );
        }
    }
    
    /**
     * Example 9: Kiểm tra retryable
     */
    public void example9_CheckRetryable() {
        try {
            callExternalService();
        } catch (MicroserviceException ex) {
            if (ex.canRetry()) {
                System.out.println("Can retry after " + ex.getRetryAfterSeconds() + " seconds");
                // Implement retry logic
            } else {
                System.out.println("Cannot retry: " + ex.getRetryable().getDescription());
                // Handle as permanent error
            }
        }
    }
    
    /**
     * Example 10: Tạo custom ErrorCode cho service khác
     */
    public void example10_CustomErrorCode() {
        // Trong service khác, tạo enum riêng:
        enum ProjectServiceErrorCodes implements ErrorCode {
            PROJECT_NOT_FOUND("ERR_5000", 404,
                "https://docs.mutrapro.com/errors/ERR_5000",
                "Project not found", Retryable.NON_TRANSIENT),
            
            PROJECT_ACCESS_DENIED("ERR_5001", 403,
                "https://docs.mutrapro.com/errors/ERR_5001",
                "Access denied to project", Retryable.NON_TRANSIENT);
            
            // Implementation...
        }
        
        throw new ResourceNotFoundException(
            ProjectServiceErrorCodes.PROJECT_NOT_FOUND,
            "Project not found",
            "projectId", 456L
        );
    }
    
    // Helper methods for examples
    private void performDatabaseOperation() throws Exception {
        // Simulate database operation
    }
    
    private void callExternalService() throws MicroserviceException {
        // Simulate external service call
    }
}
