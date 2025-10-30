package com.mutrapro.api_gateway.filter;

import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;

import java.time.Duration;
import java.util.Optional;

@Component
public class JwtBlacklistWebFilter implements WebFilter, Ordered {

    private final ReactiveStringRedisTemplate redis;

    public JwtBlacklistWebFilter(ReactiveStringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public int getOrder() {
        return SecurityWebFiltersOrder.AUTHENTICATION.getOrder() + 1;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication())
                .cast(JwtAuthenticationToken.class)
                .flatMap(auth -> {
                    Jwt jwt = auth.getToken();
                    String jti = Optional.ofNullable(jwt.getId())
                            .orElse((String) jwt.getClaims().get("jti"));

                    if (jti == null || jti.isBlank()) {
                        return chain.filter(exchange);
                    }

                    String key = "blacklist:jti:" + jti;
                    return redis.hasKey(key)
                            .timeout(Duration.ofMillis(150))
                            .flatMap(blacklisted -> {
                                if (Boolean.TRUE.equals(blacklisted)) {
                                    return Mono.error(
                                            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token revoked"));
                                }
                                return chain.filter(exchange);
                            });
                })
                .switchIfEmpty(chain.filter(exchange))
                .onErrorResume(ClassCastException.class, e -> chain.filter(exchange));
    }
}
