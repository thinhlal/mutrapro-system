package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    String messageId;
    String roomId;
    String senderId;
    String senderName;
    String messageType;
    String content;
    String status;
    Instant sentAt;
}

