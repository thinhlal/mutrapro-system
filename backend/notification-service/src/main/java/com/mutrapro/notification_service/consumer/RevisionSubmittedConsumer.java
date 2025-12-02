package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.RevisionSubmittedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Consumer để tạo notification cho manager khi specialist submit revision.
 */
@Component
@Slf4j
public class RevisionSubmittedConsumer extends BaseIdempotentConsumer<RevisionSubmittedEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public RevisionSubmittedConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.revision.submitted:revision-submitted}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.RevisionSubmittedEvent"
        }
    )
    @Transactional
    public void handleRevisionSubmittedEvent(
            @Payload RevisionSubmittedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received RevisionSubmittedEvent from topic: {}, eventId={}, revisionRequestId={}, managerUserId={}",
                topic, event.getEventId(), event.getRevisionRequestId(), event.getManagerUserId());

        handleEvent(event, acknowledgment);
    }

    @Override
    protected String getConsumerName() {
        return CONSUMER_NAME;
    }

    @Override
    protected ConsumedEventRepository getConsumedEventRepository() {
        return consumedEventRepository::insert;
    }

    @Override
    protected UUID getEventId(RevisionSubmittedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(RevisionSubmittedEvent event, Acknowledgment acknowledgment) {
        notificationService.createRevisionSubmittedNotification(event);
    }
}

