package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.SubmissionDeliveredEvent;
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
 * Consumer để tạo notification cho customer khi submission được deliver.
 */
@Component
@Slf4j
public class SubmissionDeliveredConsumer extends BaseIdempotentConsumer<SubmissionDeliveredEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public SubmissionDeliveredConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.submission.delivered:submission-delivered}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.SubmissionDeliveredEvent"
        }
    )
    @Transactional
    public void handleSubmissionDeliveredEvent(
            @Payload SubmissionDeliveredEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received SubmissionDeliveredEvent from topic: {}, eventId={}, submissionId={}, assignmentId={}, customerUserId={}",
                topic, event.getEventId(), event.getSubmissionId(), event.getAssignmentId(), event.getCustomerUserId());

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
    protected UUID getEventId(SubmissionDeliveredEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(SubmissionDeliveredEvent event, Acknowledgment acknowledgment) {
        notificationService.createSubmissionDeliveredNotification(event);
    }
}

