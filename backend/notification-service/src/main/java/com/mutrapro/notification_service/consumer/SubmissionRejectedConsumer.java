package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.SubmissionRejectedEvent;
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
 * Consumer để tạo notification cho specialist khi manager reject submission lần đầu (không phải revision).
 */
@Component
@Slf4j
public class SubmissionRejectedConsumer extends BaseIdempotentConsumer<SubmissionRejectedEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public SubmissionRejectedConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.submission.rejected:submission-rejected}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.SubmissionRejectedEvent"
        }
    )
    @Transactional
    public void handleSubmissionRejectedEvent(
            @Payload SubmissionRejectedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received SubmissionRejectedEvent from topic: {}, eventId={}, submissionId={}, specialistUserId={}",
                topic, event.getEventId(), event.getSubmissionId(), event.getSpecialistUserId());

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
    protected UUID getEventId(SubmissionRejectedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(SubmissionRejectedEvent event, Acknowledgment acknowledgment) {
        notificationService.createSubmissionRejectedNotification(event);
    }
}

