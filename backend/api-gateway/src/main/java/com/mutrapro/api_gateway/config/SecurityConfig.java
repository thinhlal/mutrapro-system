package com.mutrapro.api_gateway.config;

import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Value("${app.api-prefix:/api/v1}")
    private String apiPrefix;

    private static final String[] PUBLIC_ENDPOINTS = {
            "/actuator/**",
            "/identity/auth/**",
            // Swagger UI endpoints cho tất cả services
            "/**/swagger-ui/**",
            "/**/swagger-ui.html",
            "/**/v3/api-docs/**"
    };

    @Bean
    public ReactiveJwtDecoder jwtDecoder(@Value("${jwt.signerKey}") String signerKey) {
        byte[] secret = signerKey.getBytes(StandardCharsets.UTF_8);
        SecretKeySpec secretKey = new SecretKeySpec(secret, "HmacSHA512");
        return NimbusReactiveJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter gac = new JwtGrantedAuthoritiesConverter();
        // Shared chuẩn: map claim scope -> ROLE_*
        gac.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(gac);
        return converter;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(
            ServerHttpSecurity http,
            JwtAuthenticationConverter jwtConverter) {
        String[] publicPaths = buildPublicPaths();
        
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(registry -> registry
                        .pathMatchers(publicPaths).permitAll()
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                            .jwtAuthenticationConverter(new ReactiveJwtAuthenticationConverterAdapter(jwtConverter))
                        )
                )
                .build();
    }

    private String[] buildPublicPaths() {
        String[] paths = new String[PUBLIC_ENDPOINTS.length];
        for (int i = 0; i < PUBLIC_ENDPOINTS.length; i++) {
            String endpoint = PUBLIC_ENDPOINTS[i];
            // Actuator không cần prefix
            if (endpoint.startsWith("/actuator")) {
                paths[i] = endpoint;
            } else {
                paths[i] = apiPrefix + endpoint;
            }
        }
        return paths;
    }
}


