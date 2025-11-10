package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.chat_service.enums.RoomType;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

public class ChatRoomAlreadyExistsException extends BusinessException {
    
    private ChatRoomAlreadyExistsException(String message) {
        super(ChatErrorCodes.CHAT_ROOM_ALREADY_EXISTS, message);
    }
    
    private ChatRoomAlreadyExistsException(String message, Map<String, Object> details) {
        super(ChatErrorCodes.CHAT_ROOM_ALREADY_EXISTS, message, details);
    }
    
    public static ChatRoomAlreadyExistsException create(RoomType roomType, String contextId) {
        return new ChatRoomAlreadyExistsException(
            "Chat room already exists for this context",
            Map.of("roomType", roomType.name(), "contextId", contextId)
        );
    }
}

