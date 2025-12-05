package com.mutrapro.project_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.shared.config.OutboxTopicProperties;
import com.mutrapro.shared.outbox.BaseOutboxPublisher;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component
public class OutboxPublisher extends BaseOutboxPublisher<OutboxEvent> {

    private final com.mutrapro.project_service.repository.OutboxEventRepository outboxEventRepository;
    private final Map<String, String> eventTypeToTopicMap;

    public OutboxPublisher(KafkaTemplate<String, Object> kafkaTemplate,
                           com.mutrapro.project_service.repository.OutboxEventRepository outboxEventRepository,
                           OutboxTopicProperties outboxTopicProperties) {
        super(kafkaTemplate);
        this.outboxEventRepository = outboxEventRepository;
        this.eventTypeToTopicMap = Map.copyOf(outboxTopicProperties.getMappings());
    }

    @Override
    protected com.mutrapro.shared.outbox.BaseOutboxPublisher.OutboxEventRepository<OutboxEvent> getOutboxEventRepository() {
        return now -> outboxEventRepository.findPendingEvents(now);
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
    protected void setPublishedAt(OutboxEvent event, LocalDateTime publishedAt) {
        event.setPublishedAt(publishedAt);
    }

    @Override
    protected void setNextRetryAt(OutboxEvent event, LocalDateTime nextRetryAt) {
        event.setNextRetryAt(nextRetryAt);
    }

    @Override
    protected void saveEvent(OutboxEvent event) {
        outboxEventRepository.save(event);
    }
}

