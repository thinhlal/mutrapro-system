package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.ContractNotificationEvent;
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
 * Consumer để tạo notification cho các contract events (sent, approved, need revision, canceled, etc.).
 */
@Component
@Slf4j
public class ContractNotificationConsumer extends BaseIdempotentConsumer<ContractNotificationEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public ContractNotificationConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.contract.notification:contract-notification}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.ContractNotificationEvent"
        }
    )
    @Transactional
    public void handleContractNotificationEvent(
            @Payload ContractNotificationEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received ContractNotificationEvent from topic: {}, eventId={}, contractId={}, userId={}, notificationType={}",
                topic, event.getEventId(), event.getContractId(), event.getUserId(), event.getNotificationType());

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
    protected UUID getEventId(ContractNotificationEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(ContractNotificationEvent event, Acknowledgment acknowledgment) {
        notificationService.createContractNotification(event);
    }
}

