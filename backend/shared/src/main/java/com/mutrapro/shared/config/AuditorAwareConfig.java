package com.mutrapro.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

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
                
                // Lấy user ID từ authentication principal
                Object principal = authentication.getPrincipal();
                
                if (principal instanceof String) {
                    return Optional.of((String) principal);
                } else {
                    // Fallback: lấy name từ authentication
                    String username = authentication.getName();
                    return Optional.of(username != null ? username : "SYSTEM");
                }
            } catch (Exception e) {
                // Fallback về SYSTEM nếu có lỗi
                return Optional.of("SYSTEM");
            }
        };
    }
}
