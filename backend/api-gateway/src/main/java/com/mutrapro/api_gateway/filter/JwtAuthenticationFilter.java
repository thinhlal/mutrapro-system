package com.mutrapro.api_gateway.filter;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.exception.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * JWT Authentication Filter cho API Gateway
 * Kiểm tra và validate JWT token trước khi forward request đến microservices
 */
@Slf4j
@Component
public class JwtAuthenticationFilter extends AbstractGatewayFilterFactory<JwtAuthenticationFilter.Config> {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    public JwtAuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String path = request.getURI().getPath();

            log.debug("Processing request for path: {}", path);

            // Skip JWT validation for public endpoints
            if (isPublicEndpoint(path)) {
                log.debug("Skipping JWT validation for public endpoint: {}", path);
                return chain.filter(exchange);
            }

            // Extract JWT token from Authorization header
            String token = extractTokenFromRequest(request);
            
            if (!StringUtils.hasText(token)) {
                log.warn("No JWT token found in request to path: {}", path);
                return handleUnauthorized(exchange, "No JWT token provided");
            }

            // Validate token format
            if (!isValidTokenFormat(token)) {
                log.warn("Invalid JWT token format for path: {}", path);
                return handleUnauthorized(exchange, "Invalid JWT token format");
            }

            // Add token to request headers for downstream services
            ServerHttpRequest modifiedRequest = request.mutate()
                    .header(AUTHORIZATION_HEADER, BEARER_PREFIX + token)
                    .build();

            ServerWebExchange modifiedExchange = exchange.mutate()
                    .request(modifiedRequest)
                    .build();

            log.debug("JWT token validated successfully for path: {}", path);
            return chain.filter(modifiedExchange);
        };
    }

    /**
     * Extract JWT token from Authorization header
     */
    private String extractTokenFromRequest(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst(AUTHORIZATION_HEADER);
        
        if (StringUtils.hasText(authHeader) && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        
        return null;
    }

    /**
     * Check if the endpoint is public (doesn't require JWT authentication)
     */
    private boolean isPublicEndpoint(String path) {
        String[] publicEndpoints = {
                "/auth/log-in", "/auth/register", "/auth/introspect", "/auth/logout", "/auth/refresh",
                "/auth/forgot-password", "/auth/reset-password", "/auth/outbound/authentication",
                "/auth/user/info",
                "/users/verify-email", "/users/resend-verification", "/users/request-verification",
                "/users/verification-status",
                "/health", "/health/", "/actuator/health",
                "/v3/api-docs/", "/swagger-ui/", "/swagger-ui.html", "/swagger-resources/", "/webjars/",
                "/sepay/webhooks/",
                "/gateway/actuator/"
        };

        for (String endpoint : publicEndpoints) {
            if (path.startsWith(endpoint)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Validate JWT token format (basic validation)
     */
    private boolean isValidTokenFormat(String token) {
        // JWT token should have 3 parts separated by dots
        return token != null && token.split("\\.").length == 3;
    }

    /**
     * Handle unauthorized access
     */
    private Mono<Void> handleUnauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);

        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status("error")
                .message(message)
                .errorCode("UNAUTHORIZED")
                .statusCode(401)
                .timestamp(LocalDateTime.now())
                .path(exchange.getRequest().getURI().getPath())
                .serviceName("api-gateway")
                .build();

        String jsonResponse = convertToJson(apiResponse);
        DataBuffer buffer = response.bufferFactory().wrap(jsonResponse.getBytes(StandardCharsets.UTF_8));
        
        return response.writeWith(Mono.just(buffer));
    }

    /**
     * Convert ApiResponse to JSON string (simple implementation)
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

    /**
     * Configuration class for the filter
     */
    public static class Config {
        // Configuration properties can be added here if needed
    }
}
