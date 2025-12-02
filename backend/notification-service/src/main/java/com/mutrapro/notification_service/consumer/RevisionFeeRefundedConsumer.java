package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.RevisionFeeRefundedEvent;
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
 * Consumer để tạo notification khi revision fee được refund cho customer.
 */
@Component
@Slf4j
public class RevisionFeeRefundedConsumer extends BaseIdempotentConsumer<RevisionFeeRefundedEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public RevisionFeeRefundedConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.billing.revision.fee.refunded:billing-revision-fee-refunded}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.RevisionFeeRefundedEvent"
        }
    )
    @Transactional
    public void handleRevisionFeeRefundedEvent(
            @Payload RevisionFeeRefundedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received RevisionFeeRefundedEvent from topic: {}, eventId={}, revisionRequestId={}, customerUserId={}, paidWalletTxId={}",
                topic, event.getEventId(), event.getRevisionRequestId(), event.getCustomerUserId(), event.getPaidWalletTxId());

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
    protected UUID getEventId(RevisionFeeRefundedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(RevisionFeeRefundedEvent event, Acknowledgment acknowledgment) {
        notificationService.createRevisionFeeRefundedNotification(event);
    }
}

