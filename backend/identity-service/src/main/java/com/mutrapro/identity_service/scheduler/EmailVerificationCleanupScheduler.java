package com.mutrapro.identity_service.scheduler;

import com.mutrapro.identity_service.repository.EmailVerificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
        LocalDateTime now = LocalDateTime.now();
        int expired = emailVerificationRepository.markExpired(now);

        LocalDateTime cutoff = now.minusDays(30);
        int deleted = emailVerificationRepository.deleteExpiredOlderThan(cutoff);

        if (expired > 0 || deleted > 0) {
            log.info("Email verification cleanup: markedExpired={}, deletedExpiredOlderThan30d={}", expired, deleted);
        }
    }
}


