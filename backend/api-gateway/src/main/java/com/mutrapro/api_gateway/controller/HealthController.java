package com.mutrapro.api_gateway.controller;

import com.mutrapro.shared.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Health Check Controller cho API Gateway
 * Cung cấp endpoints để kiểm tra trạng thái của gateway
 */
@Slf4j
@RestController
@RequestMapping("/gateway")
public class HealthController {

    @Value("${spring.application.name}")
    private String applicationName;

    @Value("${spring.profiles.active:default}")
    private String activeProfile;

    @Value("${server.port:8080}")
    private String serverPort;

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> healthData = new HashMap<>();
        healthData.put("status", "UP");
        healthData.put("service", applicationName);
        healthData.put("profile", activeProfile);
        healthData.put("port", serverPort);
        healthData.put("timestamp", LocalDateTime.now());
        healthData.put("uptime", System.currentTimeMillis());

        ApiResponse<Map<String, Object>> response = ApiResponse.<Map<String, Object>>builder()
                .data(healthData)
                .message("API Gateway is running")
                .serviceName("api-gateway")
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Actuator info endpoint
     */
    @GetMapping("/actuator/info")
    public ResponseEntity<ApiResponse<Map<String, Object>>> info() {
        Map<String, Object> info = new HashMap<>();
        info.put("application", applicationName);
        info.put("version", "1.0.0");
        info.put("profile", activeProfile);
        info.put("port", serverPort);
        info.put("javaVersion", System.getProperty("java.version"));
        info.put("osName", System.getProperty("os.name"));
        info.put("osVersion", System.getProperty("os.version"));
        info.put("timestamp", LocalDateTime.now());

        ApiResponse<Map<String, Object>> response = ApiResponse.<Map<String, Object>>builder()
                .data(info)
                .message("API Gateway information")
                .serviceName("api-gateway")
                .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Gateway status endpoint
     */
    @GetMapping("/actuator/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> status() {
        Map<String, Object> status = new HashMap<>();
        status.put("gateway", "UP");
        status.put("routing", "ACTIVE");
        status.put("authentication", "ENABLED");
        status.put("logging", "ENABLED");
        status.put("timestamp", LocalDateTime.now());

        ApiResponse<Map<String, Object>> response = ApiResponse.<Map<String, Object>>builder()
                .data(status)
                .message("Gateway status information")
                .serviceName("api-gateway")
                .build();

        return ResponseEntity.ok(response);
    }
}
