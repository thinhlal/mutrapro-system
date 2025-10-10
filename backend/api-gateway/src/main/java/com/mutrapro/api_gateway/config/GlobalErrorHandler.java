package com.mutrapro.api_gateway.config;

import com.mutrapro.shared.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.reactive.error.ErrorWebExceptionHandler;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Global Error Handler cho API Gateway
 * Xử lý tất cả các lỗi và trả về response format thống nhất
 */
@Slf4j
@Component
public class GlobalErrorHandler implements ErrorWebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        log.error("Global error handler caught exception: ", ex);

        ServerHttpResponse response = exchange.getResponse();
        
        // Determine HTTP status and error message
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = "Internal server error";
        String errorCode = "INTERNAL_ERROR";

        if (ex instanceof org.springframework.security.core.AuthenticationException) {
            status = HttpStatus.UNAUTHORIZED;
            message = "Authentication failed";
            errorCode = "AUTHENTICATION_FAILED";
        } else if (ex instanceof org.springframework.security.access.AccessDeniedException) {
            status = HttpStatus.FORBIDDEN;
            message = "Access denied";
            errorCode = "ACCESS_DENIED";
        } else if (ex instanceof org.springframework.web.server.ResponseStatusException) {
            org.springframework.web.server.ResponseStatusException statusException = 
                (org.springframework.web.server.ResponseStatusException) ex;
            status = statusException.getStatus();
            message = statusException.getReason() != null ? statusException.getReason() : status.getReasonPhrase();
            errorCode = "HTTP_ERROR_" + status.value();
        } else if (ex instanceof java.net.ConnectException) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
            message = "Service unavailable";
            errorCode = "SERVICE_UNAVAILABLE";
        } else if (ex instanceof java.util.concurrent.TimeoutException) {
            status = HttpStatus.REQUEST_TIMEOUT;
            message = "Request timeout";
            errorCode = "REQUEST_TIMEOUT";
        }

        response.setStatusCode(status);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status("error")
                .message(message)
                .errorCode(errorCode)
                .statusCode(status.value())
                .timestamp(LocalDateTime.now())
                .path(exchange.getRequest().getURI().getPath())
                .serviceName("api-gateway")
                .build();

        String jsonResponse = convertToJson(apiResponse);
        DataBuffer buffer = response.bufferFactory().wrap(jsonResponse.getBytes(StandardCharsets.UTF_8));
        
        return response.writeWith(Mono.just(buffer));
    }

    /**
     * Convert ApiResponse to JSON string
     */
    private String convertToJson(ApiResponse<Void> response) {
        return String.format(
                "{\"status\":\"%s\",\"message\":\"%s\",\"errorCode\":\"%s\",\"statusCode\":%d,\"timestamp\":\"%s\",\"path\":\"%s\",\"serviceName\":\"%s\"}",
                response.getStatus(),
                response.getMessage(),
                response.getErrorCode(),
                response.getStatusCode(),
                response.getTimestamp(),
                response.getPath(),
                response.getServiceName()
        );
    }
}
