package com.mutrapro.shared.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Base abstract class cho Kafka Consumers với Idempotency Pattern
 * Mỗi consumer extends và implement processEvent() để xử lý business logic
 * 
 * Cách sử dụng:
 * 1. Service extends BaseIdempotentConsumer<EventType>
 * 2. Implement getConsumerName() và getConsumedEventRepository()
 * 3. Implement processEvent() để xử lý business logic
 */
@Slf4j
@RequiredArgsConstructor
public abstract class BaseIdempotentConsumer<T> {

    /**
     * Get consumer name - mỗi service implement (ví dụ: "notification-service")
     */
    protected abstract String getConsumerName();

    /**
     * Get ConsumedEventRepository - mỗi service implement
     */
    protected abstract ConsumedEventRepository getConsumedEventRepository();

    /**
     * Extract eventId từ event - mỗi service implement
     */
    protected abstract UUID getEventId(T event);

    /**
     * Process business logic - mỗi service implement
     */
    protected abstract void processEvent(T event, Acknowledgment acknowledgment);

    /**
     * Template method để xử lý event với idempotency check
     */
    @Transactional
    public void handleEvent(T event, Acknowledgment acknowledgment) {
        UUID eventId = getEventId(event);
        String consumerName = getConsumerName();
        
        try {
            // 1. Thử insert vào consumed_events (idempotent-by-schema)
            int rowsAffected = getConsumedEventRepository().insert(eventId, consumerName, LocalDateTime.now());
            
            if (rowsAffected == 0) {
                // Đã xử lý rồi → bỏ qua
                log.info("Event already processed, skipping: eventId={}, consumer={}", 
                        eventId, consumerName);
                acknowledgment.acknowledge();
                return;
            }
            
            log.info("Processing new event: eventId={}, consumer={}", eventId, consumerName);
            
            // 2. Xử lý business logic (service implement)
            // Service không cần gọi acknowledgment.acknowledge() - base class sẽ gọi
            processEvent(event, acknowledgment);
            
            // 3. Manually acknowledge message after successful processing
            acknowledgment.acknowledge();
            
            log.info("Event processed successfully: eventId={}, consumer={}", eventId, consumerName);
            
        } catch (Exception e) {
            log.error("Failed to process event: eventId={}, consumer={}", 
                    eventId, consumerName, e);
            // Don't acknowledge - message will be retried
            // Transaction sẽ rollback → consumed_events cũng bị rollback
            throw e; // Will trigger retry
        }
    }

    /**
     * Interface cho ConsumedEventRepository - generic
     */
    public interface ConsumedEventRepository {
        /**
         * Insert event vào consumed_events với idempotency
         * ON CONFLICT DO NOTHING - nếu đã có thì không insert, không throw exception
         * 
         * @return số rows affected (0 nếu duplicate, 1 nếu success)
         */
        int insert(UUID eventId, String consumerName, LocalDateTime processedAt);
    }
}

