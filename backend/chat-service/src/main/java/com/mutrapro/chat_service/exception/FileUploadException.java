package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception cho các lỗi khi upload file trong chat
 * HTTP Status: 400 Bad Request (default) hoặc 500 Internal Server Error
 */
public class FileUploadException extends BusinessException {
    
    private FileUploadException(ChatErrorCodes errorCode, String message) {
        super(errorCode, message);
    }
    
    private FileUploadException(ChatErrorCodes errorCode, String message, Map<String, Object> details) {
        super(errorCode, message, details);
    }
    
    private FileUploadException(ChatErrorCodes errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
    }
    
    private FileUploadException(ChatErrorCodes errorCode, String message, Map<String, Object> details, Throwable cause) {
        super(errorCode, message, details, cause);
    }
    
    /**
     * File is empty
     */
    public static FileUploadException empty() {
        return new FileUploadException(
            ChatErrorCodes.FILE_UPLOAD_EMPTY,
            "File cannot be empty"
        );
    }
    
    /**
     * File size exceeds maximum limit
     */
    public static FileUploadException tooLarge(long fileSize, long maxSize) {
        return new FileUploadException(
            ChatErrorCodes.FILE_UPLOAD_TOO_LARGE,
            String.format("File size (%d bytes) exceeds maximum limit of %d bytes", fileSize, maxSize),
            Map.of("fileSize", fileSize, "maxSize", maxSize)
        );
    }
    
    /**
     * Failed to upload file
     */
    public static FileUploadException failed(String fileName, String errorMessage) {
        return new FileUploadException(
            ChatErrorCodes.FILE_UPLOAD_FAILED,
            "Failed to upload file: " + errorMessage,
            Map.of("fileName", fileName != null ? fileName : "unknown")
        );
    }
    
    /**
     * Failed to upload file with cause
     */
    public static FileUploadException failed(String fileName, String errorMessage, Throwable cause) {
        return new FileUploadException(
            ChatErrorCodes.FILE_UPLOAD_FAILED,
            "Failed to upload file: " + errorMessage,
            Map.of("fileName", fileName != null ? fileName : "unknown"),
            cause
        );
    }
}

