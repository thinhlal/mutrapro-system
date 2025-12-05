package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event để gửi system message vào chat room
 * Chat Service lắng nghe để gửi message vào đúng room (REQUEST_CHAT hoặc CONTRACT_CHAT)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatSystemMessageEvent implements Serializable {

    UUID eventId;           // Unique event ID for idempotency
    String roomType;        // "REQUEST_CHAT" hoặc "CONTRACT_CHAT"
    String contextId;       // requestId (nếu REQUEST_CHAT) hoặc contractId (nếu CONTRACT_CHAT)
    String message;         // Nội dung system message
    LocalDateTime timestamp;      // Event timestamp
}

