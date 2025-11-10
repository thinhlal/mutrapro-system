package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.shared.exception.ForbiddenException;

import java.util.Map;

public class ChatRoomAccessDeniedException extends ForbiddenException {
    
    private ChatRoomAccessDeniedException(String message) {
        super(ChatErrorCodes.CHAT_ROOM_ACCESS_DENIED, message);
    }
    
    private ChatRoomAccessDeniedException(String message, Map<String, Object> details) {
        super(ChatErrorCodes.CHAT_ROOM_ACCESS_DENIED, message, details);
    }
    
    public static ChatRoomAccessDeniedException create(String roomId, String userId) {
        return new ChatRoomAccessDeniedException(
            "Access denied to chat room",
            Map.of("roomId", roomId, "userId", userId)
        );
    }
}

