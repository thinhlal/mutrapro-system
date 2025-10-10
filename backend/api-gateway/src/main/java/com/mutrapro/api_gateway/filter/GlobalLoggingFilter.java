package com.mutrapro.api_gateway.filter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Global Logging Filter cho API Gateway
 * Log tất cả requests và responses
 */
@Slf4j
@Component
public class GlobalLoggingFilter implements GlobalFilter, Ordered {

    private static final String TRACE_ID_HEADER = "X-Trace-Id";
    private static final String START_TIME_ATTRIBUTE = "startTime";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        ServerHttpResponse response = exchange.getResponse();

        // Generate trace ID
        String traceId = UUID.randomUUID().toString();
        
        // Add trace ID to request headers
        ServerHttpRequest modifiedRequest = request.mutate()
                .header(TRACE_ID_HEADER, traceId)
                .build();

        // Add trace ID to response headers
        response.getHeaders().add(TRACE_ID_HEADER, traceId);

        // Store start time for duration calculation
        exchange.getAttributes().put(START_TIME_ATTRIBUTE, System.currentTimeMillis());

        // Create modified exchange
        ServerWebExchange modifiedExchange = exchange.mutate()
                .request(modifiedRequest)
                .build();

        // Log request
        logRequest(modifiedExchange, traceId);

        return chain.filter(modifiedExchange)
                .doOnSuccess(aVoid -> logResponse(modifiedExchange, traceId, true))
                .doOnError(throwable -> logResponse(modifiedExchange, traceId, false, throwable));
    }

    /**
     * Log incoming request
     */
    private void logRequest(ServerWebExchange exchange, String traceId) {
        ServerHttpRequest request = exchange.getRequest();
        
        log.info("=== REQUEST START ===");
        log.info("Trace ID: {}", traceId);
        log.info("Method: {}", request.getMethod());
        log.info("URI: {}", request.getURI());
        log.info("Headers: {}", request.getHeaders());
        log.info("Remote Address: {}", request.getRemoteAddress());
        log.info("Timestamp: {}", LocalDateTime.now());
        log.info("=== REQUEST END ===");
    }

    /**
     * Log outgoing response
     */
    private void logResponse(ServerWebExchange exchange, String traceId, boolean success) {
        logResponse(exchange, traceId, success, null);
    }

    /**
     * Log outgoing response with error details
     */
    private void logResponse(ServerWebExchange exchange, String traceId, boolean success, Throwable throwable) {
        ServerHttpRequest request = exchange.getRequest();
        ServerHttpResponse response = exchange.getResponse();
        
        Long startTime = exchange.getAttribute(START_TIME_ATTRIBUTE);
        long duration = startTime != null ? System.currentTimeMillis() - startTime : 0;

        log.info("=== RESPONSE START ===");
        log.info("Trace ID: {}", traceId);
        log.info("Method: {}", request.getMethod());
        log.info("URI: {}", request.getURI());
        log.info("Status: {}", response.getStatusCode());
        log.info("Headers: {}", response.getHeaders());
        log.info("Duration: {}ms", duration);
        log.info("Success: {}", success);
        
        if (throwable != null) {
            log.error("Error: {}", throwable.getMessage(), throwable);
        }
        
        log.info("Timestamp: {}", LocalDateTime.now());
        log.info("=== RESPONSE END ===");
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
