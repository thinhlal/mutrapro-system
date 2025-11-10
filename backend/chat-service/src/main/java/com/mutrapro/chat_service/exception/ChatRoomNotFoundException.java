package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.chat_service.enums.RoomType;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

public class ChatRoomNotFoundException extends ResourceNotFoundException {
    
    private ChatRoomNotFoundException(String message) {
        super(ChatErrorCodes.CHAT_ROOM_NOT_FOUND, message);
    }
    
    private ChatRoomNotFoundException(String message, Map<String, Object> details) {
        super(ChatErrorCodes.CHAT_ROOM_NOT_FOUND, message, details);
    }
    
    public static ChatRoomNotFoundException byId(String roomId) {
        return new ChatRoomNotFoundException(
            "Chat room not found",
            Map.of("roomId", roomId)
        );
    }
    
    public static ChatRoomNotFoundException byContext(RoomType roomType, String contextId) {
        return new ChatRoomNotFoundException(
            "Chat room not found for context",
            Map.of("roomType", roomType.name(), "contextId", contextId)
        );
    }
}

