package com.mutrapro.chat_service.consumer;

import com.mutrapro.chat_service.dto.request.CreateRequestChatRequest;
import com.mutrapro.chat_service.dto.response.ChatRoomResponse;
import com.mutrapro.chat_service.service.ChatRoomService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.RequestAssignedEvent;
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
 * Consumer lắng nghe events từ Request Service
 * Tự động tạo chat room khi request được assign manager
 * Extends BaseIdempotentConsumer để tránh duplicate idempotency logic
 */
@Slf4j
@Component
public class RequestEventConsumer extends BaseIdempotentConsumer<RequestAssignedEvent> {
    
    private final ChatRoomService chatRoomService;
    private final com.mutrapro.chat_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "chat-service";
    
    public RequestEventConsumer(ChatRoomService chatRoomService,
                               com.mutrapro.chat_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.chatRoomService = chatRoomService;
        this.consumedEventRepository = consumedEventRepository;
    }
    
    @KafkaListener(
        topics = "${app.event-topics.mappings.request.assigned:request-events}",
        groupId = "${spring.kafka.consumer.group-id:chat-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.RequestAssignedEvent"
        }
    )
    @Transactional
    public void handleRequestAssignedEvent(
            @Payload RequestAssignedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received RequestAssignedEvent from topic: {}, eventId: {}, requestId: {}", 
                topic, event.getEventId(), event.getRequestId());
        
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
    protected UUID getEventId(RequestAssignedEvent event) {
        return event.getEventId();
    }
    
    @Override
    protected void processEvent(RequestAssignedEvent event, Acknowledgment acknowledgment) {
        // Xử lý business logic
        CreateRequestChatRequest request = CreateRequestChatRequest.builder()
                .requestId(event.getRequestId())
                .roomName("Tư vấn: " + event.getTitle())
                .ownerId(event.getOwnerId())
                .ownerName(event.getOwnerName() != null ? event.getOwnerName() : "Customer")
                .managerId(event.getManagerId())
                .managerName(event.getManagerName() != null ? event.getManagerName() : "Manager")
                .build();
        
        ChatRoomResponse room = chatRoomService.createRoomForRequest(
                event.getRequestId(), request);
        
        log.info("Chat room created successfully: eventId={}, requestId={}, roomId={}", 
                event.getEventId(), event.getRequestId(), room.getRoomId());
    }
}

