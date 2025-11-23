package com.mutrapro.shared.config;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import feign.RequestInterceptor;
import feign.RequestTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Slf4j
@AutoConfiguration
@ConditionalOnClass(RequestInterceptor.class)
public class FeignAutoConfiguration {

	@Bean
	@ConditionalOnMissingBean(RequestInterceptor.class)
	@ConditionalOnProperty(name = "jwt.signerKey")
	public RequestInterceptor jwtPropagatingRequestInterceptor(
			@Value("${jwt.signerKey}") String jwtSignerKey) {
		return new RequestInterceptor() {
			@Override
			public void apply(RequestTemplate template) {
				Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
				
				if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
					// Use user's JWT token if available
					String tokenValue = jwt.getTokenValue();
					template.header("Authorization", "Bearer " + tokenValue);
					log.debug("[Feign] Added user JWT token to request header");
				} else {
					// Generate system token for internal service calls (e.g., from Kafka consumers)
					try {
						String systemToken = generateSystemToken(jwtSignerKey);
						template.header("Authorization", "Bearer " + systemToken);
						log.debug("[Feign] Added system JWT token to request header");
					} catch (JOSEException e) {
						log.error("[Feign] Failed to generate system token: {}", e.getMessage(), e);
					}
				}
			}
		};
	}

	/**
	 * Generate a system JWT token for internal service-to-service calls
	 * This token represents a system user with ADMIN role
	 */
	private String generateSystemToken(String jwtSignerKey) throws JOSEException {
		JWSHeader header = new JWSHeader(JWSAlgorithm.HS512);
		
		String jti = UUID.randomUUID().toString();
		
		JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
				.subject("system@mutrapro.com")
				.issuer("mutrapro.com")
				.issueTime(new Date())
				.expirationTime(Date.from(Instant.now().plus(1, ChronoUnit.HOURS)))
				.jwtID(jti)
				.claim("type", "access")
				.claim("scope", "SYSTEM_ADMIN")
				.claim("userId", "SYSTEM_ADMIN")
				.build();
		
		SignedJWT signedJWT = new SignedJWT(header, claimsSet);
		JWSSigner signer = new MACSigner(jwtSignerKey.getBytes());
		signedJWT.sign(signer);
		
		return signedJWT.serialize();
	}
}
