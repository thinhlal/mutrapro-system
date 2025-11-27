package com.mutrapro.notification_service.consumer;

import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.ChatRoomCreatedEvent;
import com.mutrapro.notification_service.service.NotificationService;
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
 * Kafka Consumer để nhận chat room created events và tạo in-app notifications
 */
@Component
@Slf4j
public class ChatRoomCreatedConsumer extends BaseIdempotentConsumer<ChatRoomCreatedEvent> {

    private final NotificationService notificationService;
    private final com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "notification-service";

    public ChatRoomCreatedConsumer(NotificationService notificationService,
                                   com.mutrapro.notification_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.notificationService = notificationService;
        this.consumedEventRepository = consumedEventRepository;
    }

    @KafkaListener(
        topics = "${app.event-topics.mappings.chat.room.created:chat-events}",
        groupId = "${spring.kafka.consumer.group-id:notification-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.ChatRoomCreatedEvent"
        }
    )
    @Transactional
    public void handleChatRoomCreatedEvent(
            @Payload ChatRoomCreatedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received ChatRoomCreatedEvent from topic: {}, eventId: {}, roomId: {}, roomType: {}", 
                topic, event.getEventId(), event.getRoomId(), event.getRoomType());
        
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
    protected UUID getEventId(ChatRoomCreatedEvent event) {
        return event.getEventId();
    }

    @Override
    protected void processEvent(ChatRoomCreatedEvent event, Acknowledgment acknowledgment) {
        try {
            // Tạo in-app notifications cho tất cả participants
            notificationService.createChatRoomNotifications(event);
            
            log.info("In-app notifications created successfully: eventId={}, roomId={}, participants={}", 
                    event.getEventId(), event.getRoomId(), event.getParticipantIds() != null ? event.getParticipantIds().length : 0);
        } catch (Exception e) {
            log.error("Failed to create notifications: eventId={}, roomId={}, error={}", 
                    event.getEventId(), event.getRoomId(), e.getMessage(), e);
            throw e; // Re-throw để trigger retry
        }
    }
}

