package com.mutrapro.shared.outbox;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Base abstract class cho OutboxPublisher trong shared module
 * Mỗi service extends và implement các abstract methods để access fields của OutboxEvent
 * 
 * Cách sử dụng:
 * 1. Service extends BaseOutboxPublisher<OutboxEvent>
 * 2. Implement getOutboxEventRepository() và getEventTypeToTopicMap()
 * 3. Implement các abstract methods để access fields
 */
@Slf4j
@RequiredArgsConstructor
public abstract class BaseOutboxPublisher<T> {

    protected final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.outbox.max-retries:3}")
    protected int maxRetries;

    /**
     * Get OutboxEvent repository - mỗi service implement
     */
    protected abstract OutboxEventRepository<T> getOutboxEventRepository();

    /**
     * Get event type to topic mapping - mỗi service implement
     */
    protected abstract Map<String, String> getEventTypeToTopicMap();

    /**
     * Publish pending events từ outbox ra Kafka
     * Chạy mỗi 5 giây
     */
    @Scheduled(fixedDelay = 5000) // Every 5 seconds
    @Transactional
    public void publishPendingEvents() {
        LocalDateTime now = LocalDateTime.now();
        List<T> pendingEvents = getOutboxEventRepository().findPendingEvents(now);

        if (pendingEvents.isEmpty()) {
            return;
        }

        log.debug("Found {} pending events to publish", pendingEvents.size());

        Map<String, String> eventTypeToTopicMap = getEventTypeToTopicMap();

        for (T event : pendingEvents) {
            try {
                String eventType = getEventType(event);
                Object outboxId = getOutboxId(event);

                // Get topic name from event type
                String topic = eventTypeToTopicMap.get(eventType);
                if (topic == null) {
                    log.warn("No topic mapping found for event type: {}. Skipping event with outboxId: {}",
                            eventType, outboxId);
                    markAsSkipped(event, "No topic mapping found for event type: " + eventType);
                    continue;
                }

                // Get event payload
                JsonNode eventPayload = getEventPayload(event);
                
                // Publish to Kafka (blocking to ensure we can handle errors synchronously)
                kafkaTemplate.send(topic, eventPayload).get();
                
                // Mark as published
                log.info("Event published successfully: outboxId={}, eventType={}, topic={}",
                        outboxId, eventType, topic);
                markAsPublished(event);

            } catch (Exception e) {
                log.error("Error processing outbox event: outboxId={}, eventType={}",
                        getOutboxId(event), getEventType(event), e);
                // Handle retry logic
                handlePublishFailure(event, e);
            }
        }
    }

    /**
     * Abstract methods - mỗi service implement để access fields của OutboxEvent
     */
    protected abstract String getEventType(T event);
    protected abstract Object getOutboxId(T event);
    protected abstract JsonNode getEventPayload(T event);
    protected abstract Integer getRetryCount(T event);
    protected abstract void setRetryCount(T event, Integer retryCount);
    protected abstract void setLastError(T event, String error);
    protected abstract void setPublishedAt(T event, LocalDateTime publishedAt);
    protected abstract void setNextRetryAt(T event, LocalDateTime nextRetryAt);
    protected abstract void saveEvent(T event);

    private void markAsPublished(T event) {
        setPublishedAt(event, LocalDateTime.now());
        saveEvent(event);
    }

    private void markAsSkipped(T event, String error) {
        setPublishedAt(event, LocalDateTime.now()); // Mark as published to skip
        setLastError(event, error);
        saveEvent(event);
    }

    protected void handlePublishFailure(T event, Exception ex) {
        setRetryCount(event, getRetryCount(event) + 1);
        setLastError(event, ex.getMessage());

        if (getRetryCount(event) >= maxRetries) {
            log.error("Max retries reached for event: outboxId={}, eventType={}. Marking as published.",
                    getOutboxId(event), getEventType(event));
            // Mark as published để không retry nữa
            // TODO: Có thể đẩy vào Dead Letter Queue (DLQ) ở đây
            setPublishedAt(event, LocalDateTime.now());
        } else {
            // Exponential backoff: 1s, 2s, 4s, ...
            long delaySeconds = (long) Math.pow(2, getRetryCount(event) - 1);
            setNextRetryAt(event, LocalDateTime.now().plusSeconds(delaySeconds));
        }

        saveEvent(event);
    }

    /**
     * Interface cho OutboxEventRepository - generic
     */
    public interface OutboxEventRepository<T> {
        List<T> findPendingEvents(LocalDateTime now);
    }
}

