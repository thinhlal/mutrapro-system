package com.mutrapro.project_service.scheduler;

import com.mutrapro.project_service.service.ContractService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job để dọn các contract sign session đã hết hạn/đã hủy
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ContractSignSessionCleanupScheduler {

    private final ContractService contractService;

    /**
     * Dọn các sign session hết hạn mỗi giờ
     * Cron expression: 0 10 * * * ? (mỗi giờ tại phút 10)
     */
    @Scheduled(cron = "0 10 * * * ?")
    public void cleanupExpiredSessions() {
        log.info("Starting scheduled job: Cleanup expired contract sign sessions");
        try {
            int removed = contractService.cleanupExpiredSignSessions();
            if (removed > 0) {
                log.info("Scheduled job completed: Removed {} expired sign sessions", removed);
            } else {
                log.debug("Scheduled job completed: No expired sign sessions found");
            }
        } catch (Exception e) {
            log.error("Error in scheduled job: Cleanup expired contract sign sessions", e);
        }
    }
}


