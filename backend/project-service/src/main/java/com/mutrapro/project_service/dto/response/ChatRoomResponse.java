package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomResponse {
    String roomId;
    String roomType;
    String contextId;
    String roomName;
    String description;
    Boolean isActive;
    Integer participantCount;
}

