package com.mutrapro.notification_service.consumer;

import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.PasswordResetEvent;
import com.mutrapro.notification_service.service.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Kafka Consumer để nhận password reset events và gửi email
 * Extends BaseIdempotentConsumer để tránh duplicate idempotency logic
 */
@Component
@Slf4j
public class PasswordResetConsumer extends BaseIdempotentConsumer<PasswordResetEvent> {

    private final EmailService emailService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public PasswordResetConsumer(EmailService emailService, 
                                com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.emailService = emailService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.password.reset:password-reset}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.PasswordResetEvent"
        }
    )
    @Transactional
    public void handlePasswordResetEvent(
            @Payload PasswordResetEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received password reset event from topic: {}, eventId: {}, email: {}", 
                topic, event.getEventId(), event.getEmail());
        
        // Gọi base class method để xử lý với idempotency check
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
    protected UUID getEventId(PasswordResetEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(PasswordResetEvent event, Acknowledgment acknowledgment) {
        // Xử lý business logic
        emailService.sendPasswordResetLink(event.getEmail(), event.getFullName(), 
                event.getResetToken(), event.getExpiryHours());
        log.info("Password reset email sent successfully: eventId={}, email={}", 
                event.getEventId(), event.getEmail());
    }
}

