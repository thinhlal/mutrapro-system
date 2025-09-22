package com.mutrapro.shared.exception;

import java.io.Serial;
import java.util.Map;

/**
 * Exception cho trường hợp service không khả dụng (circuit breaker, timeout, etc.)
 * HTTP Status: 503 Service Unavailable (default)
 */
public class ServiceUnavailableException extends MicroserviceException {
    
    @Serial
    private static final long serialVersionUID = 1L;
    
    private final String serviceName;
    
    public ServiceUnavailableException(ErrorCode errorCode, String message, String serviceName) {
        super(errorCode, message);
        this.serviceName = serviceName;
    }
    
    public ServiceUnavailableException(ErrorCode errorCode, String message, Map<String, Object> details, String serviceName) {
        super(errorCode, message, details);
        this.serviceName = serviceName;
    }
    
    public ServiceUnavailableException(ErrorCode errorCode, String message, String serviceName, Throwable cause) {
        super(errorCode, message, cause);
        this.serviceName = serviceName;
    }
    
    public ServiceUnavailableException(ErrorCode errorCode, String message, Map<String, Object> details, 
                                    String serviceName, Throwable cause) {
        super(errorCode, message, details, cause);
        this.serviceName = serviceName;
    }
    
    /**
     * Constructor tiện dụng với single detail
     */
    public ServiceUnavailableException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName) {
        super(errorCode, message, detailKey, detailValue);
        this.serviceName = serviceName;
    }
    
    /**
     * Constructor tiện dụng với single detail và cause
     */
    public ServiceUnavailableException(ErrorCode errorCode, String message, String detailKey, Object detailValue, String serviceName, Throwable cause) {
        super(errorCode, message, detailKey, detailValue, cause);
        this.serviceName = serviceName;
    }
    
    public String getServiceName() {
        return serviceName;
    }
}
