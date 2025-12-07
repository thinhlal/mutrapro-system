package com.mutrapro.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

@Configuration
public class AuditorAwareConfig {

    @Bean
    public AuditorAware<String> auditorAware() {
        return () -> {
            try {
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                
                if (authentication == null || !authentication.isAuthenticated() || 
                    "anonymousUser".equals(authentication.getPrincipal())) {
                    return Optional.of("SYSTEM");
                }
                
                // Lấy userId từ JWT claim (đồng bộ với logic trong FileAccessService)
                Object principal = authentication.getPrincipal();
                
                if (principal instanceof Jwt jwt) {
                    String userId = jwt.getClaimAsString("userId");
                    if (userId != null && !userId.isEmpty()) {
                        return Optional.of(userId);
                    }
                }
                
                // Fallback: nếu không phải JWT hoặc không có userId claim
                // Lấy name từ authentication (có thể là email hoặc username)
                String username = authentication.getName();
                return Optional.of(username != null ? username : "SYSTEM");
            } catch (Exception e) {
                // Fallback về SYSTEM nếu có lỗi
                return Optional.of("SYSTEM");
            }
        };
    }
}
