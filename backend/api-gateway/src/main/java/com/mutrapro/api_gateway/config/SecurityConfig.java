package com.mutrapro.api_gateway.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Value("${app.api-prefix:/api/v1}")
    private String apiPrefix;

    @Value("${app.cors.allowed-origins}")
    private String allowedOriginsConfig;

    private static final String[] PUBLIC_ENDPOINTS = {
            "/actuator/**",
            "/identity/auth/**",
            "/identity/users/verify-email",
            "/identity/users/resend-verification",
            "/identity/users/verification-status",
            "/*/swagger-ui/**",
            "/*/swagger-ui.html",
            "/*/v3/api-docs/**"
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
        gac.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(gac);
        return converter;
    }

    @Bean
    public SecurityWebFilterChain securityWebFilterChain(
            ServerHttpSecurity http,
            JwtAuthenticationConverter jwtConverter
    ) {
        String[] publicPaths = buildPublicPaths();

        return http
                // dùng CORS reactive
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(registry -> registry
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers(publicPaths).permitAll()
                        .anyExchange().authenticated()
                )
                // thêm CORS vào cả lỗi 401/403
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((exchange, ex) -> writeCorsUnauthorized(exchange))
                        .accessDeniedHandler((exchange, ex) -> writeCorsForbidden(exchange))
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .jwtAuthenticationConverter(new ReactiveJwtAuthenticationConverterAdapter(jwtConverter))
                        )
                )
                .build();
    }

    /**
     * Parse allowed origins từ config
     * Hỗ trợ cả list YAML và comma-separated string (từ env variable)
     */
    private List<String> getAllowedOrigins() {
        if (allowedOriginsConfig == null || allowedOriginsConfig.trim().isEmpty()) {
            return List.of("http://localhost:5173");
        }
        // Nếu là comma-separated string (từ env variable), split nó
        // Spring Boot sẽ tự động convert YAML list thành comma-separated string khi dùng @Value
        return Arrays.stream(allowedOriginsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    // CORS REACTIVE
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> allowedOrigins = getAllowedOrigins();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(allowedOrigins); // Lấy từ YAML config
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Origin",
                "Content-Type",
                "Accept",
                "Authorization",
                "X-Requested-With"
        ));
        config.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // chú ý: đây là bản reactive
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private Mono<Void> writeCorsUnauthorized(ServerWebExchange exchange) {
        var response = exchange.getResponse();
        setCorsHeaders(exchange);
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return response.setComplete();
    }

    private Mono<Void> writeCorsForbidden(ServerWebExchange exchange) {
        var response = exchange.getResponse();
        setCorsHeaders(exchange);
        response.setStatusCode(HttpStatus.FORBIDDEN);
        return response.setComplete();
    }

    private void setCorsHeaders(ServerWebExchange exchange) {
        var request = exchange.getRequest();
        var origin = request.getHeaders().getOrigin();
        var headers = exchange.getResponse().getHeaders();
        List<String> allowedOrigins = getAllowedOrigins();

        // Kiểm tra origin có trong danh sách allowed origins từ config
        if (origin != null && allowedOrigins.contains(origin)) {
            headers.set("Access-Control-Allow-Origin", origin);
            headers.set("Access-Control-Allow-Credentials", "true");
            headers.add("Vary", "Origin");
        }
    }

    private String[] buildPublicPaths() {
        String[] paths = new String[PUBLIC_ENDPOINTS.length];
        for (int i = 0; i < PUBLIC_ENDPOINTS.length; i++) {
            String endpoint = PUBLIC_ENDPOINTS[i];
            if (endpoint.startsWith("/actuator")) {
                paths[i] = endpoint;
            } else {
                paths[i] = apiPrefix + endpoint;
            }
        }
        return paths;
    }
}
