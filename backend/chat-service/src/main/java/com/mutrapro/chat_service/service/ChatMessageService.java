package com.mutrapro.chat_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.dto.response.ChatMessageResponse;
import com.mutrapro.chat_service.dto.response.FileUploadResponse;
import com.mutrapro.chat_service.entity.ChatMessage;
import com.mutrapro.chat_service.entity.ChatParticipant;
import com.mutrapro.chat_service.entity.ChatRoom;
import com.mutrapro.chat_service.enums.MessageContextType;
import com.mutrapro.chat_service.enums.MessageStatus;
import com.mutrapro.chat_service.exception.ChatRoomAccessDeniedException;
import com.mutrapro.chat_service.exception.ChatRoomNotFoundException;
import com.mutrapro.chat_service.exception.FileAccessDeniedException;
import com.mutrapro.chat_service.exception.FileDownloadException;
import com.mutrapro.chat_service.exception.FileUploadException;
import com.mutrapro.chat_service.exception.UnauthorizedException;
import com.mutrapro.chat_service.mapper.ChatMessageMapper;
import com.mutrapro.chat_service.repository.ChatMessageRepository;
import com.mutrapro.chat_service.repository.ChatParticipantRepository;
import com.mutrapro.chat_service.repository.ChatRoomRepository;
import com.mutrapro.shared.service.S3Service;
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
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
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
    S3Service s3Service;
    ObjectMapper objectMapper;

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
                .sentAt(LocalDateTime.now())
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
                .sentAt(LocalDateTime.now())
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
        return getRoomMessages(roomId, page, size, null, null);
    }

    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getRoomMessages(String roomId, int page, int size,
                                                       String contextType, String contextId) {
        String userId = getCurrentUserId();
        
        // Verify access
        verifyParticipantAccess(roomId, userId);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messagesPage;

        // Filter theo contextType và contextId nếu có (để filter messages theo revision, milestone, etc.)
        if (contextType != null && !contextType.isBlank() && contextId != null && !contextId.isBlank()) {
            try {
                MessageContextType messageContextType = MessageContextType.valueOf(contextType);
                messagesPage = chatMessageRepository.findByChatRoomAndContextTypeAndContextId(
                        roomId, messageContextType, contextId, pageable);
                log.debug("Filtering messages by context: roomId={}, contextType={}, contextId={}",
                        roomId, contextType, contextId);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid contextType: {}, falling back to all messages", contextType);
                messagesPage = chatMessageRepository.findByRoomIdOrderBySentAtDesc(roomId, pageable);
            }
        } else if (contextType != null && !contextType.isBlank()) {
            // Filter chỉ theo contextType (không có contextId cụ thể)
            try {
                MessageContextType messageContextType = MessageContextType.valueOf(contextType);
                messagesPage = chatMessageRepository.findByChatRoomAndContextType(roomId, messageContextType, pageable);
                log.debug("Filtering messages by contextType only: roomId={}, contextType={}", roomId, contextType);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid contextType: {}, falling back to all messages", contextType);
                messagesPage = chatMessageRepository.findByRoomIdOrderBySentAtDesc(roomId, pageable);
            }
        } else {
            // Không filter - lấy tất cả messages
            messagesPage = chatMessageRepository.findByRoomIdOrderBySentAtDesc(roomId, pageable);
        }
        
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
    public List<ChatMessageResponse> getRecentMessages(String roomId, LocalDateTime since) {
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

    /**
     * Upload file cho chat và trả về file URL
     * File được upload lên S3 public folder và trả về public URL
     * Frontend sẽ dùng URL này để gửi message qua WebSocket
     */
    @Transactional
    public FileUploadResponse uploadFile(MultipartFile file, String roomId) {
        String userId = getCurrentUserId();
        
        // Verify user is participant
        verifyParticipantAccess(roomId, userId);
        
        // Validate file
        if (file == null || file.isEmpty()) {
            throw FileUploadException.empty();
        }
        
        // Validate file size (max 50MB)
        long maxSize = 50 * 1024 * 1024; // 50MB
        if (file.getSize() > maxSize) {
            throw FileUploadException.tooLarge(file.getSize(), maxSize);
        }
        
        try {
            // Upload to S3 private folder (không public, cần authentication để download)
            String fileKey = s3Service.uploadFileAndReturnKey(
                    file.getInputStream(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    "chat-files/" + roomId  // folder: chat-files/{roomId}/
            );
            
            // Determine file type based on MIME type
            String fileType = determineFileType(file.getContentType());
            
            // Create metadata JSON (lưu fileKey để download sau này)
            ObjectNode metadata = objectMapper.createObjectNode();
            metadata.put("fileName", file.getOriginalFilename());
            metadata.put("fileSize", file.getSize());
            metadata.put("mimeType", file.getContentType());
            metadata.put("fileType", fileType);
            metadata.put("fileKey", fileKey);  // Lưu S3 key để download
            
            log.info("File uploaded successfully: roomId={}, fileName={}, fileKey={}, fileType={}", 
                    roomId, file.getOriginalFilename(), fileKey, fileType);
            
            // Return fileKey thay vì public URL (frontend sẽ dùng để download qua API)
            return FileUploadResponse.builder()
                    .fileUrl(null)  // Không trả về public URL
                    .fileName(file.getOriginalFilename())
                    .fileKey(fileKey)  // Trả về fileKey để frontend dùng download API
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType())
                    .fileType(fileType)
                    .build();
                    
        } catch (FileUploadException e) {
            // Re-throw FileUploadException as-is
            throw e;
        } catch (Exception e) {
            log.error("Failed to upload file: roomId={}, fileName={}, error={}", 
                    roomId, file.getOriginalFilename(), e.getMessage(), e);
            throw FileUploadException.failed(
                file.getOriginalFilename(), 
                e.getMessage(), 
                e
            );
        }
    }
    
    /**
     * Determine file type from MIME type
     */
    private String determineFileType(String mimeType) {
        if (mimeType == null) {
            return "file";
        }
        
        String lowerMimeType = mimeType.toLowerCase();
        
        if (lowerMimeType.startsWith("image/")) {
            return "image";
        } else if (lowerMimeType.startsWith("audio/")) {
            return "audio";
        } else if (lowerMimeType.startsWith("video/")) {
            return "video";
        } else {
            return "file";
        }
    }
    
    /**
     * Download file by fileKey (với authentication và participant check)
     * @param fileKey S3 object key
     * @param roomId Chat room ID (để verify participant access)
     * @return File content as byte array
     */
    @Transactional(readOnly = true)
    public byte[] downloadFile(String fileKey, String roomId) {
        String userId = getCurrentUserId();
        
        // Verify user is participant of the chat room
        verifyParticipantAccess(roomId, userId);
        
        // Verify fileKey belongs to this room (security check)
        if (!fileKey.startsWith("chat-files/" + roomId + "/")) {
            log.warn("File key does not belong to room: fileKey={}, roomId={}, userId={}", 
                    fileKey, roomId, userId);
            throw FileAccessDeniedException.fileNotBelongsToRoom(fileKey, roomId);
        }
        
        try {
            // Download file from S3
            byte[] fileContent = s3Service.downloadFile(fileKey);
            log.info("File downloaded successfully: fileKey={}, roomId={}, userId={}, size={}", 
                    fileKey, roomId, userId, fileContent.length);
            return fileContent;
        } catch (Exception e) {
            log.error("Failed to download file: fileKey={}, roomId={}, userId={}, error={}", 
                    fileKey, roomId, userId, e.getMessage(), e);
            throw FileDownloadException.failed(fileKey, e.getMessage(), e);
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

