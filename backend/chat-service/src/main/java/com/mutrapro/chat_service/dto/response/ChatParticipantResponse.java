package com.mutrapro.chat_service.dto.response;

import com.mutrapro.chat_service.enums.ParticipantRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatParticipantResponse {
    String participantId;
    String userId;
    String userName;
    ParticipantRole role;
    Instant joinedAt;
    Boolean isActive;
}

