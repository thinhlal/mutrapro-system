package com.mutrapro.shared.config;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.exception.CommonErrorCodes;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;

/**
 * Custom JWT Authentication Entry Point
 * Cung cấp custom error response format cho JWT authentication failures
 * Được sử dụng trong shared module để tái sử dụng across services
 */
@Slf4j
public class JWTAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, 
                        AuthenticationException authException) throws IOException {
        
        // Log authentication failure
        log.warn("JWT Authentication failed for {}: {}", 
                request.getRequestURI(), authException.getMessage());

        // Set response headers
        response.setStatus(CommonErrorCodes.UNAUTHORIZED.getHttpStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        // Create ApiResponse using CommonErrorCodes
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.UNAUTHORIZED.getCode())
                .message(CommonErrorCodes.UNAUTHORIZED.getDescription())
                .statusCode(CommonErrorCodes.UNAUTHORIZED.getHttpStatus())
                .path(request.getRequestURI())
                .serviceName(getServiceName())
                .build();
        
        // Add detailed error info in development
        if (isDevelopmentEnvironment()) {
            apiResponse.setDetails(java.util.Map.of("exception", authException.getMessage()));
        }

        // Write response
        response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        response.flushBuffer();
    }

    /**
     * Check if running in development environment
     */
    private boolean isDevelopmentEnvironment() {
        String profile = System.getProperty("spring.profiles.active", "dev");
        return "dev".equals(profile);
    }
    
    /**
     * Get service name from system properties or environment
     */
    private String getServiceName() {
        return System.getProperty("spring.application.name", "unknown-service");
    }
}
