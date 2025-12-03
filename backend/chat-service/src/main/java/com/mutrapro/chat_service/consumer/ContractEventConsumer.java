package com.mutrapro.chat_service.consumer;

import com.mutrapro.chat_service.dto.request.CreateContractChatRequest;
import com.mutrapro.chat_service.dto.response.ChatRoomResponse;
import com.mutrapro.chat_service.service.ChatRoomService;
import com.mutrapro.shared.consumer.BaseIdempotentConsumer;
import com.mutrapro.shared.event.ContractSignedEvent;
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
 * Consumer lắng nghe events từ Project Service
 * Tự động tạo chat room khi contract được signed
 * Extends BaseIdempotentConsumer để tránh duplicate idempotency logic
 */
@Slf4j
@Component
public class ContractEventConsumer extends BaseIdempotentConsumer<ContractSignedEvent> {
    
    private final ChatRoomService chatRoomService;
    private final com.mutrapro.chat_service.repository.ConsumedEventRepository consumedEventRepository;
    private static final String CONSUMER_NAME = "chat-service";
    
    public ContractEventConsumer(ChatRoomService chatRoomService,
                               com.mutrapro.chat_service.repository.ConsumedEventRepository consumedEventRepository) {
        this.chatRoomService = chatRoomService;
        this.consumedEventRepository = consumedEventRepository;
    }
    
    @KafkaListener(
        topics = "${app.event-topics.mappings.contract.signed:contract-events}",
        groupId = "${spring.kafka.consumer.group-id:chat-service}",
        properties = {
            "spring.json.value.default.type=com.mutrapro.shared.event.ContractSignedEvent"
        }
    )
    @Transactional
    public void handleContractSignedEvent(
            @Payload ContractSignedEvent event,
            @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
            Acknowledgment acknowledgment) {
        
        log.info("Received ContractSignedEvent from topic: {}, eventId: {}, contractId: {}", 
                topic, event.getEventId(), event.getContractId());
        
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
    protected UUID getEventId(ContractSignedEvent event) {
        return event.getEventId();
    }
    
    @Override
    protected void processEvent(ContractSignedEvent event, Acknowledgment acknowledgment) {
        // Xử lý business logic
        String roomName = String.format("Chat cho Contract #%s", 
                event.getContractNumber() != null ? event.getContractNumber() : event.getContractId().substring(0, 8));
        
        CreateContractChatRequest request = CreateContractChatRequest.builder()
                .contractId(event.getContractId())
                .roomName(roomName)
                .customerId(event.getCustomerId())
                .customerName(event.getCustomerName() != null ? event.getCustomerName() : "Customer")
                .managerId(event.getManagerId())
                .managerName(event.getManagerName() != null ? event.getManagerName() : "Manager")
                .build();
        
        // Tạo contract chat room, đóng request chat room và gửi welcome message
        ChatRoomResponse room = chatRoomService.createContractRoomAndSendWelcomeMessage(
                event.getContractId(), 
                event.getRequestId(), 
                request,
                event.getContractNumber()
        );
        
        log.info("Chat room created and welcome message sent: eventId={}, contractId={}, roomId={}", 
                event.getEventId(), event.getContractId(), room.getRoomId());
    }
}

