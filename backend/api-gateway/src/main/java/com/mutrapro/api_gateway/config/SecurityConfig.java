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
                        .pathMatchers(apiPrefix + "/identity/auth/**").permitAll()
                        // Swagger UI endpoints cho tất cả services
                        .pathMatchers(apiPrefix + "/identity/swagger-ui/**", apiPrefix + "/identity/swagger-ui.html", apiPrefix + "/identity/v3/api-docs/**").permitAll()
                        .pathMatchers(apiPrefix + "/projects/swagger-ui/**", apiPrefix + "/projects/swagger-ui.html", apiPrefix + "/projects/v3/api-docs/**").permitAll()
                        .pathMatchers(apiPrefix + "/billing/swagger-ui/**", apiPrefix + "/billing/swagger-ui.html", apiPrefix + "/billing/v3/api-docs/**").permitAll()
                        .pathMatchers(apiPrefix + "/requests/swagger-ui/**", apiPrefix + "/requests/swagger-ui.html", apiPrefix + "/requests/v3/api-docs/**").permitAll()
                        .pathMatchers(apiPrefix + "/notifications/swagger-ui/**", apiPrefix + "/notifications/swagger-ui.html", apiPrefix + "/notifications/v3/api-docs/**").permitAll()
                        .pathMatchers(apiPrefix + "/specialists/swagger-ui/**", apiPrefix + "/specialists/swagger-ui.html", apiPrefix + "/specialists/v3/api-docs/**").permitAll()
                        .pathMatchers(apiPrefix + "/studios/swagger-ui/**", apiPrefix + "/studios/swagger-ui.html", apiPrefix + "/studios/v3/api-docs/**").permitAll()
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


