package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

public class ParticipantNotFoundException extends ResourceNotFoundException {
    
    private ParticipantNotFoundException(String message) {
        super(ChatErrorCodes.PARTICIPANT_NOT_FOUND, message);
    }
    
    private ParticipantNotFoundException(String message, Map<String, Object> details) {
        super(ChatErrorCodes.PARTICIPANT_NOT_FOUND, message, details);
    }
    
    public static ParticipantNotFoundException byRoomAndUser(String roomId, String userId) {
        return new ParticipantNotFoundException(
            "Participant not found in chat room",
            Map.of("roomId", roomId, "userId", userId)
        );
    }
}

