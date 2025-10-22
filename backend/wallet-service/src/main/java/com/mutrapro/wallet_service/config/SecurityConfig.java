package com.mutrapro.wallet_service.config;

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
 * Security Configuration cho Wallet Service
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
                        .requestMatchers(HttpMethod.GET, "/wallets/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.POST, "/wallets").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/wallets/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.DELETE, "/wallets/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/wallet-transactions/**").hasAnyRole("ADMIN", "USER", "STUDIO")
                        .requestMatchers(HttpMethod.POST, "/wallet-transactions").hasAnyRole("ADMIN", "USER")
                        .requestMatchers(HttpMethod.PUT, "/wallet-transactions/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/wallet-transactions/**").hasRole("ADMIN")
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
