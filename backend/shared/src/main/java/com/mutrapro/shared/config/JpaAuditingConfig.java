package com.mutrapro.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.auditing.DateTimeProvider;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware", dateTimeProviderRef = "dateTimeProvider")
public class JpaAuditingConfig {

    @Bean
    public DateTimeProvider dateTimeProvider() {
        return () -> {
            // Sử dụng timezone Việt Nam (UTC+7)
            ZoneId vietnamZone = ZoneId.of("Asia/Ho_Chi_Minh");
            ZonedDateTime now = ZonedDateTime.now(vietnamZone);
            return Optional.of(now.toLocalDateTime());
        };
    }
}
