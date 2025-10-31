package com.mutrapro.api_gateway.filter;

import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

@Component
public class RequestIdFilter implements WebFilter, Ordered {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    public int getOrder() {
        return HIGHEST_PRECEDENCE;
    }

    @Override
    public Mono<Void> filter(@NonNull ServerWebExchange exchange, @NonNull WebFilterChain chain) {
        HttpHeaders headers = exchange.getRequest().getHeaders();

        String requestId = getOrCreateRequestId(headers);

        var mutatedRequest = exchange.getRequest().mutate()
                .headers(h -> h.set(REQUEST_ID_HEADER, requestId))
                .build();

        var mutatedExchange = exchange.mutate().request(mutatedRequest).build();

        // also echo back on response for clients to read
        mutatedExchange.getResponse().getHeaders().set(REQUEST_ID_HEADER, requestId);

        return chain.filter(mutatedExchange);
    }

    private String getOrCreateRequestId(HttpHeaders headers) {
        List<String> existing = headers.get(REQUEST_ID_HEADER);
        if (existing != null && !existing.isEmpty() && existing.get(0) != null && !existing.get(0).isBlank()) {
            return existing.get(0);
        }
        // short uuid without dashes for readability
        return UUID.randomUUID().toString().replace("-", "");
    }
}


