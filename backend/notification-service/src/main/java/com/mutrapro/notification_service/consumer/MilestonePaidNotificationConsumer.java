package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.MilestonePaidNotificationEvent;
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
 * Consumer để tạo notification cho manager khi milestone được thanh toán.
 */
@Component
@Slf4j
public class MilestonePaidNotificationConsumer extends BaseIdempotentConsumer<MilestonePaidNotificationEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public MilestonePaidNotificationConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.milestone.paid.notification:milestone-paid-notification}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.MilestonePaidNotificationEvent"
        }
    )
    @Transactional
    public void handleMilestonePaidNotificationEvent(
            @Payload MilestonePaidNotificationEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received MilestonePaidNotificationEvent from topic: {}, eventId={}, contractId={}, milestoneId={}, managerUserId={}",
                topic, event.getEventId(), event.getContractId(), event.getMilestoneId(), event.getManagerUserId());

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
    protected UUID getEventId(MilestonePaidNotificationEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(MilestonePaidNotificationEvent event, Acknowledgment acknowledgment) {
        notificationService.createMilestonePaidNotification(event);
    }
}

