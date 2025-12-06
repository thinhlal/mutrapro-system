package com.mutrapro.notification_service.consumer;

import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.PaymentOrderCompletedNotificationEvent;
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
 * Consumer để tạo notification cho user khi payment order được thanh toán thành công.
 */
@Component
@Slf4j
public class PaymentOrderCompletedNotificationConsumer extends BaseIdempotentConsumer<PaymentOrderCompletedNotificationEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public PaymentOrderCompletedNotificationConsumer(
            NotificationService notificationService,
            com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.payment.order.completed.notification:payment-order-completed-notification}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.PaymentOrderCompletedNotificationEvent"
        }
    )
    @Transactional
    public void handlePaymentOrderCompletedNotificationEvent(
            @Payload PaymentOrderCompletedNotificationEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {

        log.info("Received PaymentOrderCompletedNotificationEvent from topic: {}, eventId={}, paymentOrderId={}, userId={}",
                topic, event.getEventId(), event.getPaymentOrderId(), event.getUserId());

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
    protected UUID getEventId(PaymentOrderCompletedNotificationEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(PaymentOrderCompletedNotificationEvent event, Acknowledgment acknowledgment) {
        notificationService.createPaymentOrderCompletedNotification(event);
    }
}

