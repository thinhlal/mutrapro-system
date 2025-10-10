package com.mutrapro.api_gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Gateway Configuration - định nghĩa routing cho các microservices
 */
@Configuration
public class GatewayConfig {

    @Value("${services.auth-service.url:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${services.user-service.url:http://localhost:8082}")
    private String userServiceUrl;

    @Value("${services.project-service.url:http://localhost:8083}")
    private String projectServiceUrl;

    @Value("${services.quotation-service.url:http://localhost:8084}")
    private String quotationServiceUrl;

    @Value("${services.task-service.url:http://localhost:8085}")
    private String taskServiceUrl;

    @Value("${services.revision-service.url:http://localhost:8086}")
    private String revisionServiceUrl;

    @Value("${services.specialist-service.url:http://localhost:8087}")
    private String specialistServiceUrl;

    @Value("${services.studio-service.url:http://localhost:8088}")
    private String studioServiceUrl;

    @Value("${services.payment-service.url:http://localhost:8089}")
    private String paymentServiceUrl;

    @Value("${services.notification-service.url:http://localhost:8090}")
    private String notificationServiceUrl;

    @Value("${services.feedback-service.url:http://localhost:8091}")
    private String feedbackServiceUrl;

    @Value("${services.file-service.url:http://localhost:8092}")
    private String fileServiceUrl;

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Auth Service Routes
                .route("auth-service", r -> r
                        .path("/auth/**")
                        .uri(authServiceUrl)
                )
                .route("auth-service-alternative", r -> r
                        .path("/log-in", "/register", "/introspect")
                        .uri(authServiceUrl)
                )

                // User Service Routes
                .route("user-service", r -> r
                        .path("/users/**")
                        .uri(userServiceUrl)
                )

                // Project Service Routes
                .route("project-service", r -> r
                        .path("/projects/**")
                        .uri(projectServiceUrl)
                )

                // Quotation Service Routes
                .route("quotation-service", r -> r
                        .path("/quotations/**")
                        .uri(quotationServiceUrl)
                )

                // Task Service Routes
                .route("task-service", r -> r
                        .path("/tasks/**")
                        .uri(taskServiceUrl)
                )

                // Revision Service Routes
                .route("revision-service", r -> r
                        .path("/revisions/**")
                        .uri(revisionServiceUrl)
                )

                // Specialist Service Routes
                .route("specialist-service", r -> r
                        .path("/specialists/**")
                        .uri(specialistServiceUrl)
                )

                // Studio Service Routes
                .route("studio-service", r -> r
                        .path("/studios/**")
                        .uri(studioServiceUrl)
                )

                // Payment Service Routes
                .route("payment-service", r -> r
                        .path("/payments/**", "/sepay/**")
                        .uri(paymentServiceUrl)
                )

                // Notification Service Routes
                .route("notification-service", r -> r
                        .path("/notifications/**")
                        .uri(notificationServiceUrl)
                )

                // Feedback Service Routes
                .route("feedback-service", r -> r
                        .path("/feedbacks/**")
                        .uri(feedbackServiceUrl)
                )

                // File Service Routes
                .route("file-service", r -> r
                        .path("/files/**", "/uploads/**")
                        .uri(fileServiceUrl)
                )

                // Health Check Routes
                .route("health-check", r -> r
                        .path("/health", "/health/**", "/actuator/health")
                        .uri("http://localhost:8080") // Gateway's own health endpoint
                )

                .build();
    }
}
