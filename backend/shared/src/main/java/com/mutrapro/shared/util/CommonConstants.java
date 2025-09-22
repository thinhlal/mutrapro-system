package com.mutrapro.shared.util;

/**
 * Common constants cho toàn bộ hệ thống microservice
 */
public final class CommonConstants {
    
    // HTTP Headers
    public static final String TRACE_ID_HEADER = "X-Trace-Id";
    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String SERVICE_NAME_HEADER = "X-Service-Name";
    public static final String RETRY_AFTER_HEADER = "Retry-After";
    
    // Default Values
    public static final String UNKNOWN_SERVICE = "unknown";
    public static final String UNKNOWN_TRACE_ID = "unknown";
    public static final int DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
    public static final int DEFAULT_RETRY_AFTER_SECONDS = 30;
    
    // Circuit Breaker States
    public static final String CIRCUIT_BREAKER_OPEN = "OPEN";
    public static final String CIRCUIT_BREAKER_CLOSED = "CLOSED";
    public static final String CIRCUIT_BREAKER_HALF_OPEN = "HALF_OPEN";
    
    // Retry Configuration
    public static final int MAX_RETRY_ATTEMPTS = 3;
    public static final long RETRY_DELAY_MS = 1000; // 1 second
    public static final long MAX_RETRY_DELAY_MS = 10000; // 10 seconds
    
    // Validation
    public static final int MAX_PAGE_SIZE = 100;
    public static final int DEFAULT_PAGE_SIZE = 20;
    
    private CommonConstants() {
        // Utility class
    }
}
