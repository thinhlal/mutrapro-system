package com.mutrapro.chat_service.controller;

import com.mutrapro.chat_service.dto.request.SendMessageRequest;
import com.mutrapro.chat_service.dto.response.ChatMessageResponse;
import com.mutrapro.chat_service.service.ChatMessageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WebSocketChatController {

    SimpMessagingTemplate messagingTemplate;
    ChatMessageService chatMessageService;

    /**
     * SIMPLIFIED: Chỉ handle send message
     * Client gửi tin nhắn: /app/chat/{roomId}/send
     * Server broadcast đến: /topic/chat/{roomId}
     */
    @MessageMapping("/chat/{roomId}/send")
    public void sendMessage(
            @DestinationVariable String roomId,
            @Payload SendMessageRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        
        try {
            // Extract user info from WebSocket authentication
            Authentication auth = (Authentication) headerAccessor.getUser();
            if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
                log.error("No authentication found in WebSocket message");
                return;
            }
            
            String userId = jwt.getClaim("userId");
            String userName = jwt.getClaim("fullName");
            if (userName == null) {
                userName = jwt.getSubject(); // Fallback to email
            }
            
            // Send message through service with explicit user info
            ChatMessageResponse response = chatMessageService.sendMessage(request, userId, userName);
            
            // Broadcast to all participants in the room
            messagingTemplate.convertAndSend("/topic/chat/" + roomId, response);
            
            log.info("Message broadcasted to room: roomId={}, messageId={}", 
                    roomId, response.getMessageId());
            
        } catch (Exception e) {
            log.error("Error sending message: roomId={}, error={}", roomId, e.getMessage(), e);
            // Send error back to sender
            Authentication auth = (Authentication) headerAccessor.getUser();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                String userId = jwt.getClaim("userId");
                messagingTemplate.convertAndSendToUser(userId, "/queue/errors",
                        "Failed to send message: " + e.getMessage());
            }
        }
    }

    /**
     * Optional: Send personal notification to specific user
     */
    public void sendPersonalNotification(String userId, ChatMessageResponse message) {
        messagingTemplate.convertAndSendToUser(userId, "/queue/messages", message);
        log.debug("Personal notification sent: userId={}, messageId={}", userId, message.getMessageId());
    }
}

