package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

public class MessageNotFoundException extends ResourceNotFoundException {
    
    private MessageNotFoundException(String message) {
        super(ChatErrorCodes.MESSAGE_NOT_FOUND, message);
    }
    
    private MessageNotFoundException(String message, Map<String, Object> details) {
        super(ChatErrorCodes.MESSAGE_NOT_FOUND, message, details);
    }
    
    public static MessageNotFoundException byId(String messageId) {
        return new MessageNotFoundException(
            "Message not found",
            Map.of("messageId", messageId)
        );
    }
}

