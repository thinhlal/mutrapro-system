package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.shared.exception.ForbiddenException;

import java.util.Map;

/**
 * Exception cho trường hợp không có quyền truy cập file
 * HTTP Status: 403 Forbidden
 */
public class FileAccessDeniedException extends ForbiddenException {
    
    private FileAccessDeniedException(String message) {
        super(ChatErrorCodes.FILE_ACCESS_DENIED, message);
    }
    
    private FileAccessDeniedException(String message, Map<String, Object> details) {
        super(ChatErrorCodes.FILE_ACCESS_DENIED, message, details);
    }
    
    /**
     * File does not belong to this chat room
     */
    public static FileAccessDeniedException fileNotBelongsToRoom(String fileKey, String roomId) {
        return new FileAccessDeniedException(
            "File access denied: file does not belong to this chat room",
            Map.of("fileKey", fileKey != null ? fileKey : "unknown", "roomId", roomId != null ? roomId : "unknown")
        );
    }
    
    /**
     * Generic file access denied
     */
    public static FileAccessDeniedException create(String fileKey, String userId) {
        return new FileAccessDeniedException(
            "File access denied",
            Map.of("fileKey", fileKey != null ? fileKey : "unknown", "userId", userId != null ? userId : "unknown")
        );
    }
}

