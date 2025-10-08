package com.mutrapro.shared.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

import javax.crypto.spec.SecretKeySpec;

/**
 * Shared JWT Security Auto-Configuration
 * Tự động cung cấp JWT beans và method-level security cho tất cả các service
 * Chỉ tạo bean nếu chưa có bean tương tự được định nghĩa
 */
@Configuration
@EnableMethodSecurity
public class JwtSecurityConfig {

    /**
     * JWT Decoder bean - decode và validate JWT token
     * Chỉ tạo nếu chưa có JwtDecoder bean nào được định nghĩa
     */
    @Bean
    @ConditionalOnMissingBean
    public JwtDecoder jwtDecoder(@Value("${jwt.signerKey}") String signerKey) {
        SecretKeySpec secretKeySpec = new SecretKeySpec(signerKey.getBytes(), "HS512");
        return NimbusJwtDecoder
                .withSecretKey(secretKeySpec)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }

    /**
     * JWT Authentication Converter - convert JWT claims thành Spring Security authorities
     * Map claims("scope", "ADMIN") -> authority là SCOPE_ADMIN sau đó converter thành ROLE_ADMIN
     * Chỉ tạo nếu chưa có JwtAuthenticationConverter bean nào được định nghĩa
     */
    @Bean
    @ConditionalOnMissingBean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter jwtGrantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        jwtGrantedAuthoritiesConverter.setAuthorityPrefix("ROLE_");
        
        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(jwtGrantedAuthoritiesConverter);
        
        return jwtAuthenticationConverter;
    }

    /**
     * JWT Authentication Entry Point - custom error response format
     * Chỉ tạo nếu chưa có AuthenticationEntryPoint bean nào được định nghĩa
     */
    @Bean
    @ConditionalOnMissingBean
    public AuthenticationEntryPoint jwtAuthenticationEntryPoint() {
        return new JWTAuthenticationEntryPoint();
    }

    /**
     * Access Denied Handler - custom error response format cho 403 Forbidden
     * Chỉ tạo nếu chưa có AccessDeniedHandler bean nào được định nghĩa
     */
    @Bean
    @ConditionalOnMissingBean
    public AccessDeniedHandler accessDeniedHandler(ObjectMapper objectMapper) {
        return new ProblemJsonAccessDeniedHandler(objectMapper);
    }
}
