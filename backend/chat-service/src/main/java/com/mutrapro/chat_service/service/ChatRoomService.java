package com.mutrapro.chat_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.chat_service.dto.request.AddParticipantRequest;
import com.mutrapro.chat_service.dto.request.CreateChatRoomRequest;
import com.mutrapro.chat_service.dto.request.CreateContractChatRequest;
import com.mutrapro.chat_service.dto.request.CreateRequestChatRequest;
import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.dto.response.ChatRoomResponse;
import com.mutrapro.chat_service.entity.ChatParticipant;
import com.mutrapro.chat_service.entity.ChatRoom;
import com.mutrapro.chat_service.entity.OutboxEvent;
import com.mutrapro.chat_service.enums.MessageType;
import com.mutrapro.chat_service.enums.ParticipantRole;
import com.mutrapro.chat_service.enums.RoomType;
import com.mutrapro.chat_service.exception.*;
import com.mutrapro.chat_service.mapper.ChatRoomMapper;
import com.mutrapro.chat_service.repository.ChatParticipantRepository;
import com.mutrapro.chat_service.repository.ChatRoomRepository;
import com.mutrapro.chat_service.repository.OutboxEventRepository;
import com.mutrapro.shared.event.ChatRoomCreatedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatRoomService {

    ChatRoomRepository chatRoomRepository;
    ChatParticipantRepository chatParticipantRepository;
    OutboxEventRepository outboxEventRepository;
    ChatRoomMapper chatRoomMapper;
    ChatMessageService chatMessageService;
    ObjectMapper objectMapper;

    @Transactional
    public ChatRoomResponse createChatRoom(CreateChatRoomRequest request) {
        String userId = getCurrentUserId();
        
        // Check if room already exists
        if (chatRoomRepository.existsByRoomTypeAndContextId(request.getRoomType(), request.getContextId())) {
            throw ChatRoomAlreadyExistsException.create(request.getRoomType(), request.getContextId());
        }
        
        // Create room
        ChatRoom chatRoom = ChatRoom.builder()
                .roomType(request.getRoomType())
                .contextId(request.getContextId())
                .roomName(request.getRoomName())
                .description(request.getDescription())
                .isActive(true)
                .build();
        
        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);
        log.info("Created chat room: roomId={}, type={}, contextId={}", 
                savedRoom.getRoomId(), savedRoom.getRoomType(), savedRoom.getContextId());
        
        // Add creator as owner
        addParticipantToRoom(savedRoom, userId, getUserName(), ParticipantRole.OWNER);
        
        return chatRoomMapper.toResponse(savedRoom);
    }

    /**
     * Tạo room cho request khi manager được assign
     * Được gọi từ Kafka event consumer
     * IDEMPOTENT - Nếu room đã tồn tại thì return room hiện tại
     */
    @Transactional
    public ChatRoomResponse createRoomForRequest(String requestId, 
                                                  CreateRequestChatRequest request) {
        
        log.info("Creating chat room for request: requestId={}, owner={}, manager={}", 
                requestId, request.getOwnerId(), request.getManagerId());
        
        // 1. Check if room already exists (idempotent)
        Optional<ChatRoom> existingRoom = chatRoomRepository
                .findByRoomTypeAndContextId(RoomType.REQUEST_CHAT, requestId);
        
        if (existingRoom.isPresent()) {
            log.info("Chat room already exists for request: requestId={}, roomId={}", 
                    requestId, existingRoom.get().getRoomId());
            return chatRoomMapper.toResponse(existingRoom.get());
        }
        
        // 2. Create room
        ChatRoom chatRoom = ChatRoom.builder()
                .roomType(RoomType.REQUEST_CHAT)
                .contextId(requestId)
                .roomName(request.getRoomName())
                .description("Chat tư vấn cho request")
                .isActive(true)
                .build();
        
        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);
        
        // 3. Add user (request owner) as OWNER
        addParticipantToRoom(savedRoom, 
                           request.getOwnerId(), 
                           request.getOwnerName(), 
                           ParticipantRole.OWNER);
        
        // 4. Add manager as MANAGER role
        addParticipantToRoom(savedRoom, 
                           request.getManagerId(), 
                           request.getManagerName(), 
                           ParticipantRole.MANAGER);
        
        log.info("Chat room created for request: requestId={}, roomId={}, participants=[{}, {}]", 
                requestId, savedRoom.getRoomId(), request.getOwnerId(), request.getManagerId());
        
        // 5. Publish ChatRoomCreated event (for notification service)
        publishChatRoomCreatedEvent(savedRoom, request.getOwnerId(), request.getManagerId());
        
        return chatRoomMapper.toResponse(savedRoom);
    }

    /**
     * Tạo room cho contract khi contract được tạo
     * Được gọi từ Kafka event consumer hoặc project-service
     * IDEMPOTENT - Nếu room đã tồn tại thì return room hiện tại
     */
    @Transactional
    public ChatRoomResponse createRoomForContract(String contractId,
                                                   CreateContractChatRequest request) {
        
        log.info("Creating chat room for contract: contractId={}, customer={}, manager={}", 
                contractId, request.getCustomerId(), request.getManagerId());
        
        // 1. Check if room already exists (idempotent)
        Optional<ChatRoom> existingRoom = chatRoomRepository
                .findByRoomTypeAndContextId(RoomType.CONTRACT_CHAT, contractId);
        
        if (existingRoom.isPresent()) {
            log.info("Chat room already exists for contract: contractId={}, roomId={}", 
                    contractId, existingRoom.get().getRoomId());
            return chatRoomMapper.toResponse(existingRoom.get());
        }
        
        // 2. Create room
        ChatRoom chatRoom = ChatRoom.builder()
                .roomType(RoomType.CONTRACT_CHAT)
                .contextId(contractId)
                .roomName(request.getRoomName())
                .description("Chat cho contract")
                .isActive(true)
                .build();
        
        ChatRoom savedRoom = chatRoomRepository.save(chatRoom);
        
        // 3. Add customer as OWNER
        addParticipantToRoom(savedRoom, 
                           request.getCustomerId(), 
                           request.getCustomerName(), 
                           ParticipantRole.OWNER);
        
        // 4. Add manager as MANAGER role
        addParticipantToRoom(savedRoom, 
                           request.getManagerId(), 
                           request.getManagerName(), 
                           ParticipantRole.MANAGER);
        
        log.info("Chat room created for contract: contractId={}, roomId={}, participants=[customer={}, manager={}]", 
                contractId, savedRoom.getRoomId(), request.getCustomerId(), request.getManagerId());
        
        // 5. Publish ChatRoomCreated event (for notification service)
        publishChatRoomCreatedEvent(savedRoom, 
                                  request.getCustomerId(), 
                                  request.getManagerId());
        
        return chatRoomMapper.toResponse(savedRoom);
    }

    /**
     * Tạo contract chat room, đóng request chat room và gửi welcome system message
     * Được gọi từ ContractEventConsumer khi contract được signed
     */
    @Transactional
    public ChatRoomResponse createContractRoomAndSendWelcomeMessage(String contractId,
                                                                     String requestId,
                                                                     CreateContractChatRequest request,
                                                                     String contractNumber) {
        // 1. Tạo contract chat room
        ChatRoomResponse contractRoom = createRoomForContract(contractId, request);
        
        // 2. Đóng request chat room nếu có requestId
        if (requestId != null && !requestId.isBlank()) {
            try {
                Optional<ChatRoom> requestRoom = chatRoomRepository
                        .findByRoomTypeAndContextId(RoomType.REQUEST_CHAT, requestId);
                
                if (requestRoom.isPresent() && requestRoom.get().getIsActive()) {
                    deactivateRoom(requestRoom.get().getRoomId());
                    log.info("Deactivated request chat room: requestId={}, roomId={}", 
                            requestId, requestRoom.get().getRoomId());
                }
            } catch (Exception e) {
                log.error("Failed to deactivate request chat room: requestId={}, error={}", 
                        requestId, e.getMessage(), e);
                // Không throw exception - contract room đã tạo thành công
            }
        }
        
        // 3. Gửi system message vào contract chat room (sau khi room đã được tạo)
        try {
            String displayContractNumber = contractNumber != null && !contractNumber.isBlank()
                    ? contractNumber
                    : contractId.substring(0, Math.min(8, contractId.length()));
            
            String systemMessage = String.format(
                    "✍️ Customer đã ký contract #%s. Đang chờ thanh toán deposit để bắt đầu công việc.",
                    displayContractNumber
            );
            
            chatMessageService.sendSystemMessage(
                    SendMessageRequest.builder()
                            .roomId(contractRoom.getRoomId())
                            .messageType(MessageType.SYSTEM)
                            .content(systemMessage)
                            .build()
            );
            
            log.info("Sent welcome system message to contract chat room: contractId={}, roomId={}", 
                    contractId, contractRoom.getRoomId());
        } catch (Exception e) {
            // Log error nhưng không fail transaction - room đã tạo thành công
            log.error("Failed to send welcome system message to contract chat room: contractId={}, roomId={}, error={}", 
                    contractId, contractRoom.getRoomId(), e.getMessage(), e);
        }
        
        return contractRoom;
    }
    
    /**
     * Publish event khi room được tạo
     * Notification Service sẽ lắng nghe để gửi thông báo
     */
    private void publishChatRoomCreatedEvent(ChatRoom room, String ownerId, String... otherParticipantIds) {
        try {
            // Combine owner and other participants
            List<String> allParticipantIds = new java.util.ArrayList<>();
            allParticipantIds.add(ownerId);
            if (otherParticipantIds != null) {
                allParticipantIds.addAll(java.util.Arrays.asList(otherParticipantIds));
            }
            
            ChatRoomCreatedEvent event = ChatRoomCreatedEvent.builder()
                    .eventId(java.util.UUID.randomUUID())
                    .roomId(room.getRoomId())
                    .roomType(room.getRoomType().name())
                    .contextId(room.getContextId())
                    .roomName(room.getRoomName())
                    .ownerId(ownerId)
                    .participantIds(allParticipantIds.toArray(new String[0]))
                    .timestamp(LocalDateTime.now())
                    .build();
            
            // Save to outbox for guaranteed delivery
            var eventPayload = objectMapper.valueToTree(event);
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateType("ChatRoom")
                    .aggregateId(room.getRoomId())
                    .eventType("chat.room.created")
                    .eventPayload(eventPayload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            
            log.info("ChatRoomCreated event saved to outbox: roomId={}, eventType={}, participantIds={}", 
                    room.getRoomId(), "chat.room.created", allParticipantIds);
            
        } catch (Exception e) {
            log.error("Failed to publish ChatRoomCreated event: roomId={}, error={}", 
                    room.getRoomId(), e.getMessage(), e);
            // Không throw exception - room đã tạo thành công
        }
    }

    @Transactional(readOnly = true)
    public ChatRoomResponse getChatRoom(String roomId) {
        String userId = getCurrentUserId();
        
        ChatRoom chatRoom = chatRoomRepository.findByRoomIdAndParticipantUserId(roomId, userId)
                .orElseThrow(() -> ChatRoomAccessDeniedException.create(roomId, userId));
        
        return chatRoomMapper.toResponse(chatRoom);
    }

    @Transactional(readOnly = true)
    public ChatRoomResponse getChatRoomByContext(String roomType, String contextId) {
        String userId = getCurrentUserId();
        String role = getCurrentUserRole(); // scope claim contains role value
        
        RoomType type = RoomType.valueOf(roomType);
        ChatRoom chatRoom = chatRoomRepository.findByRoomTypeAndContextId(type, contextId)
                .orElseThrow(() -> ChatRoomNotFoundException.byContext(type, contextId));
        
        // Allow SYSTEM_ADMIN to access any chat room (for system messages)
        boolean isSystemAdmin = "SYSTEM_ADMIN".equals(userId) || "SYSTEM_ADMIN".equals(role);
        
        // Verify user is participant (unless system admin)
        if (!isSystemAdmin && !chatParticipantRepository.existsByChatRoom_RoomIdAndUserIdAndIsActiveTrue(
                chatRoom.getRoomId(), userId)) {
            throw ChatRoomAccessDeniedException.create(chatRoom.getRoomId(), userId);
        }
        
        return chatRoomMapper.toResponse(chatRoom);
    }

    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getUserChatRooms() {
        String userId = getCurrentUserId();
        
        List<ChatRoom> rooms = chatRoomRepository.findAllByParticipantUserId(userId);
        
        return rooms.stream()
                .map(chatRoomMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ChatRoomResponse addParticipant(String roomId, AddParticipantRequest request) {
        String currentUserId = getCurrentUserId();
        
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> ChatRoomNotFoundException.byId(roomId));
        
        // Verify current user is participant with permission
        verifyParticipantAccess(roomId, currentUserId);
        
        // Add new participant
        addParticipantToRoom(chatRoom, request.getUserId(), request.getUserName(), request.getRole());
        
        log.info("Added participant to room: roomId={}, userId={}, role={}", 
                roomId, request.getUserId(), request.getRole());
        
        return chatRoomMapper.toResponse(chatRoom);
    }

    /**
     * Deactivate chat room (đóng room)
     * Thường dùng khi request đã chuyển sang contract
     */
    @Transactional
    public void deactivateRoom(String roomId) {
        ChatRoom chatRoom = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> ChatRoomNotFoundException.byId(roomId));
        
        chatRoom.setIsActive(false);
        chatRoomRepository.save(chatRoom);
        
        log.info("Deactivated chat room: roomId={}, type={}, contextId={}", 
                roomId, chatRoom.getRoomType(), chatRoom.getContextId());
    }

    @Transactional
    public void removeParticipant(String roomId, String userId) {
        ChatParticipant participant = chatParticipantRepository
                .findByChatRoom_RoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> ParticipantNotFoundException.byRoomAndUser(roomId, userId));
        
        if (participant.getRole() == ParticipantRole.OWNER) {
            throw CannotRemoveOwnerException.create(roomId, userId);
        }
        
        participant.leave();
        chatParticipantRepository.save(participant);
        
        log.info("Removed participant from room: roomId={}, userId={}", roomId, userId);
    }

    private void addParticipantToRoom(ChatRoom chatRoom, String userId, String userName, ParticipantRole role) {
        ChatParticipant participant = ChatParticipant.builder()
                .chatRoom(chatRoom)
                .userId(userId)
                .userName(userName)
                .role(role)
                .joinedAt(LocalDateTime.now())
                .isActive(true)
                .build();
        
        chatParticipantRepository.save(participant);
    }

    private void verifyParticipantAccess(String roomId, String userId) {
        if (!chatParticipantRepository.existsByChatRoom_RoomIdAndUserIdAndIsActiveTrue(roomId, userId)) {
            throw ChatRoomAccessDeniedException.create(roomId, userId);
        }
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            // JWT subject is email, actual userId is in claim
            return jwt.getClaim("userId");
        }
        throw UnauthorizedException.create();
    }

    private String getUserName() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            // Try to get fullName from claim, fallback to email (subject)
            String fullName = jwt.getClaim("fullName");
            if (fullName != null) {
                return fullName;
            }
            return jwt.getSubject(); // Return email as fallback
        }
        throw UnauthorizedException.create();
    }

    /**
     * Get current user's role from JWT token
     * Note: The "scope" claim in JWT token actually contains the role value (ADMIN, MANAGER, CUSTOMER, etc.)
     */
    private String getCurrentUserRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getClaim("scope"); // scope claim contains role
        }
        return null;
    }
}

