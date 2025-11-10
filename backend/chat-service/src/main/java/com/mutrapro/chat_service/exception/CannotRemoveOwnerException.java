package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

public class CannotRemoveOwnerException extends BusinessException {
    
    private CannotRemoveOwnerException(String message) {
        super(ChatErrorCodes.CANNOT_REMOVE_OWNER, message);
    }
    
    private CannotRemoveOwnerException(String message, Map<String, Object> details) {
        super(ChatErrorCodes.CANNOT_REMOVE_OWNER, message, details);
    }
    
    public static CannotRemoveOwnerException create(String roomId, String userId) {
        return new CannotRemoveOwnerException(
            "Cannot remove owner from chat room",
            Map.of("roomId", roomId, "userId", userId)
        );
    }
}

