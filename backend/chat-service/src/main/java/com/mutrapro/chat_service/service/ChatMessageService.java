package com.mutrapro.chat_service.service;

import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.dto.response.ChatMessageResponse;
import com.mutrapro.chat_service.entity.ChatMessage;
import com.mutrapro.chat_service.entity.ChatParticipant;
import com.mutrapro.chat_service.entity.ChatRoom;
import com.mutrapro.chat_service.enums.MessageStatus;
import com.mutrapro.chat_service.exception.ChatRoomAccessDeniedException;
import com.mutrapro.chat_service.exception.ChatRoomNotFoundException;
import com.mutrapro.chat_service.exception.UnauthorizedException;
import com.mutrapro.chat_service.mapper.ChatMessageMapper;
import com.mutrapro.chat_service.repository.ChatMessageRepository;
import com.mutrapro.chat_service.repository.ChatParticipantRepository;
import com.mutrapro.chat_service.repository.ChatRoomRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.ArrayList;
import java.util.Collections;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatMessageService {

    ChatMessageRepository chatMessageRepository;
    ChatRoomRepository chatRoomRepository;
    ChatParticipantRepository chatParticipantRepository;
    ChatMessageMapper chatMessageMapper;
    SimpMessagingTemplate messagingTemplate;

    /**
     * Send message with explicit user info (called by WebSocketChatController)
     */
    @Transactional
    public ChatMessageResponse sendMessage(SendMessageRequest request, String userId, String userName) {
        // Verify user is participant
        ChatRoom chatRoom = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> ChatRoomNotFoundException.byId(request.getRoomId()));
        
        if (!chatParticipantRepository.existsByChatRoom_RoomIdAndUserIdAndIsActiveTrue(
                request.getRoomId(), userId)) {
            throw ChatRoomAccessDeniedException.create(request.getRoomId(), userId);
        }
        
        // Create message
        ChatMessage message = ChatMessage.builder()
                .chatRoom(chatRoom)
                .senderId(userId)
                .senderName(userName)
                .messageType(request.getMessageType())
                .content(request.getContent())
                .metadata(request.getMetadata())
                .contextType(request.getContextType())
                .contextId(request.getContextId())
                .status(MessageStatus.SENT)
                .sentAt(Instant.now())
                .build();
        
        ChatMessage savedMessage = chatMessageRepository.save(message);
        
        log.info("Message sent: messageId={}, roomId={}, senderId={}, type={}", 
                savedMessage.getMessageId(), request.getRoomId(), userId, request.getMessageType());
        
        // Note: WebSocketChatController handles broadcasting to subscribers
        return chatMessageMapper.toResponse(savedMessage);
    }

    /**
     * Send system message (không cần verify participant, dùng cho các service khác)
     * System message thường là: contract canceled, status update, etc.
     */
    @Transactional
    public ChatMessageResponse sendSystemMessage(SendMessageRequest request) {
        // Verify room exists
        ChatRoom chatRoom = chatRoomRepository.findById(request.getRoomId())
                .orElseThrow(() -> ChatRoomNotFoundException.byId(request.getRoomId()));
        
        // Create system message (không cần senderId/userName vì là system message)
        ChatMessage message = ChatMessage.builder()
                .chatRoom(chatRoom)
                .senderId("SYSTEM")  // System message
                .senderName("SYSTEM")
                .messageType(request.getMessageType())
                .content(request.getContent())
                .metadata(request.getMetadata())
                .contextType(request.getContextType())
                .contextId(request.getContextId())
                .status(MessageStatus.SENT)
                .sentAt(Instant.now())
                .build();
        
        ChatMessage savedMessage = chatMessageRepository.save(message);
        ChatMessageResponse response = chatMessageMapper.toResponse(savedMessage);
        
        log.info("System message sent: messageId={}, roomId={}, type={}", 
                savedMessage.getMessageId(), request.getRoomId(), request.getMessageType());
        
        // Broadcast system message via WebSocket để user nhận real-time
        try {
            messagingTemplate.convertAndSend("/topic/chat/" + request.getRoomId(), response);
            log.info("System message broadcasted to room: roomId={}, messageId={}", 
                    request.getRoomId(), savedMessage.getMessageId());
        } catch (Exception e) {
            log.error("Failed to broadcast system message: roomId={}, error={}", 
                    request.getRoomId(), e.getMessage(), e);
            // Không throw exception - message đã được lưu vào database
        }
        
        return response;
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getRoomMessages(String roomId, int page, int size) {
        String userId = getCurrentUserId();
        
        // Verify access
        verifyParticipantAccess(roomId, userId);
        
        Pageable pageable = PageRequest.of(page, size);
        // Query DESC để page 0 là tin nhắn mới nhất (đúng cho pagination)
        Page<ChatMessage> messagesPage = chatMessageRepository.findByRoomIdOrderBySentAtDesc(roomId, pageable);
        
        // Reverse content để trả về ASC (cũ nhất -> mới nhất) cho frontend
        // Frontend cần tin nhắn mới nhất ở dưới cùng (bottom của chat)
        List<ChatMessage> messagesList = new ArrayList<>(messagesPage.getContent());
        Collections.reverse(messagesList);
        
        // Map to response và tạo Page mới với content đã reverse
        List<ChatMessageResponse> responses = messagesList.stream()
                .map(chatMessageMapper::toResponse)
                .collect(Collectors.toList());
        
        return new PageImpl<>(responses, pageable, messagesPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getRecentMessages(String roomId, Instant since) {
        String userId = getCurrentUserId();
        
        verifyParticipantAccess(roomId, userId);
        
        List<ChatMessage> messages = chatMessageRepository.findRecentMessages(roomId, since);
        
        return messages.stream()
                .map(chatMessageMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get unread message count for current user in a chat room
     * Unread = messages sent after lastSeenAt, excluding user's own messages and SYSTEM messages
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(String roomId) {
        String userId = getCurrentUserId();
        
        // Get participant to check lastSeenAt
        ChatParticipant participant = chatParticipantRepository
                .findByChatRoom_RoomIdAndUserIdAndIsActiveTrue(roomId, userId)
                .orElseThrow(() -> ChatRoomAccessDeniedException.create(roomId, userId));
        
        // If never seen, count all messages (except own and SYSTEM)
        if (participant.getLastSeenAt() == null) {
            long count = chatMessageRepository.countByChatRoom_RoomIdAndSenderIdNotAndSenderIdNot(
                    roomId, userId, "SYSTEM");
            log.debug("Unread count (never seen): roomId={}, userId={}, count={}", roomId, userId, count);
            return count;
        }
        
        // Count messages after lastSeenAt, excluding user's own messages and SYSTEM
        long count = chatMessageRepository.countByChatRoom_RoomIdAndSentAtAfterAndSenderIdNotAndSenderIdNot(
                roomId, participant.getLastSeenAt(), userId, "SYSTEM");
        
        log.debug("Unread count: roomId={}, userId={}, lastSeenAt={}, count={}", 
                roomId, userId, participant.getLastSeenAt(), count);
        return count;
    }

    /**
     * Mark messages as read for current user in a chat room
     * Updates lastSeenAt to current time
     */
    @Transactional
    public void markAsRead(String roomId) {
        String userId = getCurrentUserId();
        
        // Get participant
        ChatParticipant participant = chatParticipantRepository
                .findByChatRoom_RoomIdAndUserIdAndIsActiveTrue(roomId, userId)
                .orElseThrow(() -> ChatRoomAccessDeniedException.create(roomId, userId));
        
        // Update lastSeenAt
        participant.markAsSeen();
        chatParticipantRepository.save(participant);
        
        log.info("Marked messages as read: roomId={}, userId={}, lastSeenAt={}", 
                roomId, userId, participant.getLastSeenAt());
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
}

