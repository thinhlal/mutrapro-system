package com.mutrapro.chat_service.exception;

import com.mutrapro.chat_service.enums.ChatErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception cho các lỗi khi download file trong chat
 * HTTP Status: 404 Not Found (default) hoặc 500 Internal Server Error
 */
public class FileDownloadException extends ResourceNotFoundException {
    
    private FileDownloadException(ChatErrorCodes errorCode, String message) {
        super(errorCode, message);
    }
    
    private FileDownloadException(ChatErrorCodes errorCode, String message, Map<String, Object> details) {
        super(errorCode, message, details);
    }
    
    private FileDownloadException(ChatErrorCodes errorCode, String message, Throwable cause) {
        super(errorCode, message, cause);
    }
    
    private FileDownloadException(ChatErrorCodes errorCode, String message, Map<String, Object> details, Throwable cause) {
        super(errorCode, message, details, cause);
    }
    
    /**
     * File not found
     */
    public static FileDownloadException notFound(String fileKey) {
        return new FileDownloadException(
            ChatErrorCodes.FILE_DOWNLOAD_NOT_FOUND,
            "File not found",
            Map.of("fileKey", fileKey != null ? fileKey : "unknown")
        );
    }
    
    /**
     * Failed to download file
     */
    public static FileDownloadException failed(String fileKey, String errorMessage) {
        return new FileDownloadException(
            ChatErrorCodes.FILE_DOWNLOAD_FAILED,
            "Failed to download file: " + errorMessage,
            Map.of("fileKey", fileKey != null ? fileKey : "unknown")
        );
    }
    
    /**
     * Failed to download file with cause
     */
    public static FileDownloadException failed(String fileKey, String errorMessage, Throwable cause) {
        return new FileDownloadException(
            ChatErrorCodes.FILE_DOWNLOAD_FAILED,
            "Failed to download file: " + errorMessage,
            Map.of("fileKey", fileKey != null ? fileKey : "unknown"),
            cause
        );
    }
}

