package com.mutrapro.project_service.scheduler;

import com.mutrapro.project_service.service.ContractService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job để check và update expired contracts
 * Chạy mỗi giờ một lần
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ContractExpirationScheduler {

    private final ContractService contractService;

    /**
     * Check và update expired contracts mỗi giờ
     * Cron expression: 0 0 * * * ? (mỗi giờ tại phút 0)
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void checkAndUpdateExpiredContracts() {
        log.info("Starting scheduled job: Check and update expired contracts");
        try {
            int updatedCount = contractService.checkAndUpdateExpiredContracts();
            if (updatedCount > 0) {
                log.info("Scheduled job completed: Updated {} expired contracts", updatedCount);
            } else {
                log.debug("Scheduled job completed: No expired contracts found");
            }
        } catch (Exception e) {
            log.error("Error in scheduled job: Check and update expired contracts", e);
        }
    }
}

