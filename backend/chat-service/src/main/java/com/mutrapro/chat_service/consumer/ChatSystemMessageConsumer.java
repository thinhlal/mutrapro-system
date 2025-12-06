package com.mutrapro.chat_service.consumer;

import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.enums.MessageContextType;
import com.mutrapro.chat_service.enums.MessageType;
import com.mutrapro.chat_service.enums.RoomType;
import com.mutrapro.chat_service.repository.ChatRoomRepository;
import com.mutrapro.chat_service.service.ChatMessageService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.ChatSystemMessageEvent;
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
 * Consumer lắng nghe ChatSystemMessageEvent để gửi system message vào chat room
 */
@Slf4j
@Component
public class ChatSystemMessageConsumer extends BaseIdempotentConsumer<ChatSystemMessageEvent> {
    
    private final ChatMessageService chatMessageService;
    private final ChatRoomRepository chatRoomRepository;
    private final com.mutrapro.chat_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "chat-service";
    
    public ChatSystemMessageConsumer(ChatMessageService chatMessageService,
                                   ChatRoomRepository chatRoomRepository,
                                   com.mutrapro.chat_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.chatMessageService = chatMessageService;
        this.chatRoomRepository = chatRoomRepository;
        this.consumedEventRepository = consumedEventRepository;
    }
    
    @KafkaListener(
        topics = "${app.event-topics.mappings.chat.system.message:chat-system-message-events}",
        groupId = "${spring.kafka.consumer.group-id:chat-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.ChatSystemMessageEvent"
        }
    )
    @Transactional
    public void handleChatSystemMessageEvent(
            @Payload ChatSystemMessageEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received ChatSystemMessageEvent from topic: {}, eventId: {}, roomType: {}, contextId: {}", 
                topic, event.getEventId(), event.getRoomType(), event.getContextId());
        
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
    protected UUID getEventId(ChatSystemMessageEvent event) {
        return event.getEventId();
    }
    
    @Override
    protected void processEvent(ChatSystemMessageEvent event, Acknowledgment acknowledgment) {
        try {
            // 1. Tìm chat room theo roomType và contextId
            RoomType roomType = RoomType.valueOf(event.getRoomType());
            String contextId = event.getContextId();
            
            var roomOpt = chatRoomRepository.findByRoomTypeAndContextId(roomType, contextId);
            
            if (roomOpt.isEmpty()) {
                log.warn("Chat room not found: roomType={}, contextId={}. Message will not be sent.", 
                        roomType, contextId);
                return;
            }
            
            var room = roomOpt.get();
            String roomId = room.getRoomId();
            
            // 2. Gửi system message vào chat room
            // System messages mặc định là GENERAL (chat chung về contract/request)
            SendMessageRequest messageRequest = SendMessageRequest.builder()
                    .roomId(roomId)
                    .messageType(MessageType.SYSTEM)
                    .content(event.getMessage())
                    .contextType(MessageContextType.GENERAL)  // Set mặc định là GENERAL
                    .build();
            
            chatMessageService.sendSystemMessage(messageRequest);
            log.info("Sent system message to chat room: eventId={}, roomId={}, roomType={}, contextId={}", 
                    event.getEventId(), roomId, roomType, contextId);
        } catch (Exception e) {
            log.error("Failed to send system message: eventId={}, roomType={}, contextId={}, error={}", 
                    event.getEventId(), event.getRoomType(), event.getContextId(), e.getMessage(), e);
            throw e; // Re-throw để base class có thể retry
        }
    }
}

