package com.mutrapro.chat_service.dto.response;

import com.mutrapro.chat_service.enums.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomResponse {
    String roomId;
    RoomType roomType;
    String contextId;
    String roomName;
    String description;
    Boolean isActive;
    Integer participantCount;
    ChatMessageResponse lastMessage;
    List<ChatParticipantResponse> participants;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

