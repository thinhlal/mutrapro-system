package com.mutrapro.request_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security Configuration cho Request Service
 * Sử dụng auto-configuration từ shared module
 * Spring Boot tự động enable web security khi phát hiện SecurityFilterChain bean
 */
@Configuration
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/health",
            "/health/**",
            "/actuator/health",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/swagger-resources/**",
            "/webjars/**"
    };

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity, 
                                         JwtAuthenticationConverter jwtAuthenticationConverter,
                                         AuthenticationEntryPoint authenticationEntryPoint,
                                         AccessDeniedHandler accessDeniedHandler) throws Exception {
        return httpSecurity
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .requestMatchers(HttpMethod.GET, "/service-requests/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.POST, "/service-requests").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/service-requests/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.DELETE, "/service-requests/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/request-booking-artists/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.POST, "/request-booking-artists").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/request-booking-artists/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.DELETE, "/request-booking-artists/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/request-booking-equipment/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.POST, "/request-booking-equipment").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/request-booking-equipment/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.DELETE, "/request-booking-equipment/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/request-notation-instruments/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.POST, "/request-notation-instruments").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/request-notation-instruments/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.DELETE, "/request-notation-instruments/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> 
                        oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
                              .authenticationEntryPoint(authenticationEntryPoint)
                )
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .build();
    }
}
