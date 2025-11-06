package com.mutrapro.request_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.mutrapro.request_service.entity.OutboxEvent;
import com.mutrapro.shared.config.OutboxTopicProperties;
import com.mutrapro.shared.outbox.BaseOutboxPublisher;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Outbox Publisher cho request-service
 * Extends BaseOutboxPublisher từ shared module để tránh duplicate code
 * Chỉ cần implement các abstract methods và config eventTypeToTopicMap
 */
@Component
public class OutboxPublisher extends BaseOutboxPublisher<OutboxEvent> {

    private final com.mutrapro.request_service.repository.OutboxEventRepository jpaOutboxEventRepository;

    private final Map<String, String> eventTypeToTopicMap;

    public OutboxPublisher(KafkaTemplate<String, Object> kafkaTemplate,
                          com.mutrapro.request_service.repository.OutboxEventRepository jpaOutboxEventRepository,
                          OutboxTopicProperties outboxTopicProperties) {
        super(kafkaTemplate);
        this.jpaOutboxEventRepository = jpaOutboxEventRepository;
        this.eventTypeToTopicMap = buildEventTypeToTopicMap(outboxTopicProperties);
    }

    private Map<String, String> buildEventTypeToTopicMap(OutboxTopicProperties props) {
        return Map.copyOf(props.getMappings());
    }

    @Override
    protected com.mutrapro.shared.outbox.BaseOutboxPublisher.OutboxEventRepository<OutboxEvent> getOutboxEventRepository() {
        return jpaOutboxEventRepository::findPendingEvents;
    }

    @Override
    protected Map<String, String> getEventTypeToTopicMap() {
        return eventTypeToTopicMap;
    }

    @Override
    protected String getEventType(OutboxEvent event) {
        return event.getEventType();
    }

    @Override
    protected Object getOutboxId(OutboxEvent event) {
        return event.getOutboxId();
    }

    @Override
    protected JsonNode getEventPayload(OutboxEvent event) {
        return event.getEventPayload();
    }

    @Override
    protected Integer getRetryCount(OutboxEvent event) {
        return event.getRetryCount();
    }

    @Override
    protected void setRetryCount(OutboxEvent event, Integer retryCount) {
        event.setRetryCount(retryCount);
    }

    @Override
    protected void setLastError(OutboxEvent event, String error) {
        event.setLastError(error);
    }

    @Override
    protected void setPublishedAt(OutboxEvent event, Instant publishedAt) {
        event.setPublishedAt(publishedAt);
    }

    @Override
    protected void setNextRetryAt(OutboxEvent event, Instant nextRetryAt) {
        event.setNextRetryAt(nextRetryAt);
    }

    @Override
    protected void saveEvent(OutboxEvent event) {
        jpaOutboxEventRepository.save(event);
    }
}

