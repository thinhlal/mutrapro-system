package com.mutrapro.identity_service.scheduler;

import com.mutrapro.identity_service.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationCleanupScheduler {

    private final EmailVerificationRepository emailVerificationRepository;

    // Chạy mỗi giờ: đánh dấu hết hạn và xóa sau 30 ngày
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void cleanupExpiredVerifications() {
        Instant now = Instant.now();
        int expired = emailVerificationRepository.markExpired(now);

        Instant cutoff = now.minus(30, ChronoUnit.DAYS);
        int deleted = emailVerificationRepository.deleteExpiredOlderThan(cutoff);

        if (expired > 0 || deleted > 0) {
            log.info("Email verification cleanup: markedExpired={}, deletedExpiredOlderThan30d={}", expired, deleted);
        }
    }
}


