package com.mutrapro.shared.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

@Slf4j
@AutoConfiguration
@ConditionalOnClass(RequestInterceptor.class)
public class FeignAutoConfiguration {

	@Bean
	@ConditionalOnMissingBean(RequestInterceptor.class)
	public RequestInterceptor jwtPropagatingRequestInterceptor() {
		return new RequestInterceptor() {
			@Override
			public void apply(RequestTemplate template) {
				Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
				if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
					String tokenValue = jwt.getTokenValue();
					template.header("Authorization", "Bearer " + tokenValue);
					log.debug("[Feign] Added JWT token to request header");
				}
			}
		};
	}
}
