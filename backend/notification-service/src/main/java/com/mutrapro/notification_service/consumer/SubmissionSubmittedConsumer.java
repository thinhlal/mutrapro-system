package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.SubmissionSubmittedEvent;
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
 * Consumer để tạo notification cho manager khi specialist submit file lần đầu (không phải revision).
 */
@Component
@Slf4j
public class SubmissionSubmittedConsumer extends BaseIdempotentConsumer<SubmissionSubmittedEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public SubmissionSubmittedConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.submission.submitted:submission-submitted}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.SubmissionSubmittedEvent"
        }
    )
    @Transactional
    public void handleSubmissionSubmittedEvent(
            @Payload SubmissionSubmittedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received SubmissionSubmittedEvent from topic: {}, eventId={}, submissionId={}, managerUserId={}",
                topic, event.getEventId(), event.getSubmissionId(), event.getManagerUserId());

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
    protected UUID getEventId(SubmissionSubmittedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(SubmissionSubmittedEvent event, Acknowledgment acknowledgment) {
        notificationService.createSubmissionSubmittedNotification(event);
    }
}

