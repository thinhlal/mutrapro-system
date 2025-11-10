package com.mutrapro.chat_service.service;

import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.dto.response.ChatMessageResponse;
import com.mutrapro.chat_service.entity.ChatMessage;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
                .status(MessageStatus.SENT)
                .sentAt(Instant.now())
                .build();
        
        ChatMessage savedMessage = chatMessageRepository.save(message);
        
        log.info("Message sent: messageId={}, roomId={}, senderId={}, type={}", 
                savedMessage.getMessageId(), request.getRoomId(), userId, request.getMessageType());
        
        // Note: WebSocketChatController handles broadcasting to subscribers
        return chatMessageMapper.toResponse(savedMessage);
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getRoomMessages(String roomId, int page, int size) {
        String userId = getCurrentUserId();
        
        // Verify access
        verifyParticipantAccess(roomId, userId);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messages = chatMessageRepository.findByRoomIdOrderBySentAtDesc(roomId, pageable);
        
        return messages.map(chatMessageMapper::toResponse);
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
}

