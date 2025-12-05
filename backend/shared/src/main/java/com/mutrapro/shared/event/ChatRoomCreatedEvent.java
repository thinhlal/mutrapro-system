package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event từ Chat Service khi chat room được tạo
 * Notification Service lắng nghe để gửi thông báo cho participants
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomCreatedEvent implements Serializable {
    
    UUID eventId;
    String roomId;
    String roomType;        // REQUEST_CHAT, CONTRACT_CHAT, etc
    String contextId;       // request_id, contract_id
    String roomName;
    
    String ownerId;
    String[] participantIds;
    
    LocalDateTime timestamp;
}

