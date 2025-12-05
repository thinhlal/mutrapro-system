package com.mutrapro.chat_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

public enum ChatErrorCodes implements ErrorCode {
    // Chat Room errors (6000-6099)
    CHAT_ROOM_NOT_FOUND("ERR_6001", 404, 
        "https://docs.mutrapro.com/errors/ERR_6001",
        "Chat room not found", Retryable.NON_TRANSIENT),
    CHAT_ROOM_ALREADY_EXISTS("ERR_6002", 409,
        "https://docs.mutrapro.com/errors/ERR_6002",
        "Chat room already exists for this context", Retryable.NON_TRANSIENT),
    CHAT_ROOM_ACCESS_DENIED("ERR_6003", 403,
        "https://docs.mutrapro.com/errors/ERR_6003",
        "You don't have permission to access this chat room", Retryable.NON_TRANSIENT),
    
    // Message errors (6100-6199)
    MESSAGE_NOT_FOUND("ERR_6101", 404,
        "https://docs.mutrapro.com/errors/ERR_6101",
        "Message not found", Retryable.NON_TRANSIENT),
    MESSAGE_TOO_LONG("ERR_6102", 400,
        "https://docs.mutrapro.com/errors/ERR_6102",
        "Message content exceeds maximum length", Retryable.NON_TRANSIENT),
    
    // Participant errors (6200-6299)
    PARTICIPANT_NOT_FOUND("ERR_6201", 404,
        "https://docs.mutrapro.com/errors/ERR_6201",
        "Participant not found in this chat room", Retryable.NON_TRANSIENT),
    PARTICIPANT_ALREADY_EXISTS("ERR_6202", 409,
        "https://docs.mutrapro.com/errors/ERR_6202",
        "User is already a participant in this chat room", Retryable.NON_TRANSIENT),
    CANNOT_REMOVE_OWNER("ERR_6203", 403,
        "https://docs.mutrapro.com/errors/ERR_6203",
        "Cannot remove the owner from chat room", Retryable.NON_TRANSIENT),
    
    // File upload/download errors (6300-6399)
    FILE_UPLOAD_EMPTY("ERR_6301", 400,
        "https://docs.mutrapro.com/errors/ERR_6301",
        "File cannot be empty", Retryable.NON_TRANSIENT),
    FILE_UPLOAD_TOO_LARGE("ERR_6302", 400,
        "https://docs.mutrapro.com/errors/ERR_6302",
        "File size exceeds maximum limit", Retryable.NON_TRANSIENT),
    FILE_UPLOAD_FAILED("ERR_6303", 500,
        "https://docs.mutrapro.com/errors/ERR_6303",
        "Failed to upload file", Retryable.TRANSIENT),
    FILE_DOWNLOAD_NOT_FOUND("ERR_6304", 404,
        "https://docs.mutrapro.com/errors/ERR_6304",
        "File not found", Retryable.NON_TRANSIENT),
    FILE_DOWNLOAD_FAILED("ERR_6305", 500,
        "https://docs.mutrapro.com/errors/ERR_6305",
        "Failed to download file", Retryable.TRANSIENT),
    FILE_ACCESS_DENIED("ERR_6306", 403,
        "https://docs.mutrapro.com/errors/ERR_6306",
        "File access denied: file does not belong to this chat room", Retryable.NON_TRANSIENT);
    
    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;
    
    ChatErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }
    
    ChatErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.type = type;
        this.description = description;
        this.retryable = retryable;
        this.retryAfterSeconds = retryAfterSeconds;
    }
    
    @Override
    public String getCode() {
        return code;
    }
    
    @Override
    public int getHttpStatus() {
        return httpStatus;
    }
    
    @Override
    public String getType() {
        return type;
    }
    
    @Override
    public String getDescription() {
        return description;
    }
    
    @Override
    public Retryable getRetryable() {
        return retryable;
    }
    
    @Override
    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

