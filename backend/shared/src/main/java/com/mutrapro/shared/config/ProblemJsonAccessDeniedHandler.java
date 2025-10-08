package com.mutrapro.shared.config;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.exception.CommonErrorCodes;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;

/**
 * Custom Access Denied Handler (403 Forbidden)
 * Cung cấp custom error response format cho access denied errors
 * Được sử dụng trong shared module để tái sử dụng across services
 */
@Slf4j
@RequiredArgsConstructor
public class ProblemJsonAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                      AccessDeniedException accessDeniedException) throws IOException {
        
        // Log access denied
        log.warn("Access denied for {}: {}", 
                request.getRequestURI(), accessDeniedException.getMessage());

        // Set response headers
        response.setStatus(CommonErrorCodes.FORBIDDEN.getHttpStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        // Create ApiResponse using CommonErrorCodes
        ApiResponse<Void> apiResponse = ApiResponse.<Void>builder()
                .status("error")
                .errorCode(CommonErrorCodes.FORBIDDEN.getCode())
                .message(CommonErrorCodes.FORBIDDEN.getDescription())
                .statusCode(CommonErrorCodes.FORBIDDEN.getHttpStatus())
                .path(request.getRequestURI())
                .serviceName(getServiceName())
                .build();
        
        // Add detailed error info in development
        if (isDevelopmentEnvironment()) {
            apiResponse.setDetails(java.util.Map.of("exception", accessDeniedException.getMessage()));
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
