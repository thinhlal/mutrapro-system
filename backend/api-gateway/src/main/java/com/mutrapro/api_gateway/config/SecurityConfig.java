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
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(registry -> registry
                        .pathMatchers("/actuator/**").permitAll()
                        .pathMatchers("/identity/auth/**").permitAll()
                        // Swagger UI endpoints cho tất cả services
                        .pathMatchers("/identity/swagger-ui/**", "/identity/swagger-ui.html", "/identity/v3/api-docs/**").permitAll()
                        .pathMatchers("/projects/swagger-ui/**", "/projects/swagger-ui.html", "/projects/v3/api-docs/**").permitAll()
                        .pathMatchers("/billing/swagger-ui/**", "/billing/swagger-ui.html", "/billing/v3/api-docs/**").permitAll()
                        .pathMatchers("/requests/swagger-ui/**", "/requests/swagger-ui.html", "/requests/v3/api-docs/**").permitAll()
                        .pathMatchers("/notifications/swagger-ui/**", "/notifications/swagger-ui.html", "/notifications/v3/api-docs/**").permitAll()
                        .pathMatchers("/specialists/swagger-ui/**", "/specialists/swagger-ui.html", "/specialists/v3/api-docs/**").permitAll()
                        .pathMatchers("/studios/swagger-ui/**", "/studios/swagger-ui.html", "/studios/v3/api-docs/**").permitAll()
                        .anyExchange().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                            .jwtAuthenticationConverter(new ReactiveJwtAuthenticationConverterAdapter(jwtConverter))
                        )
                )
                .build();
    }

}


