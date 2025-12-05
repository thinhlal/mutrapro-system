package com.mutrapro.chat_service.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.mutrapro.chat_service.enums.MessageContextType;
import com.mutrapro.chat_service.enums.MessageStatus;
import com.mutrapro.chat_service.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    String messageId;
    String roomId;
    String senderId;
    String senderName;
    MessageType messageType;
    String content;
    JsonNode metadata;
    MessageStatus status;
    MessageContextType contextType;
    String contextId;
    LocalDateTime sentAt;
    LocalDateTime createdAt;
}

