package com.mutrapro.request_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * Request Service Error Codes
 * Range: 6000-6999
 */
public enum RequestServiceErrorCodes implements ErrorCode {

    // File Upload Errors (6000-6099)
    FILE_REQUIRED("FILE_6000", 400,
        "https://docs.mutrapro.com/errors/FILE_6000",
        "File is required",
        Retryable.NON_TRANSIENT),
    
    FILE_SIZE_EXCEEDED("FILE_6001", 400,
        "https://docs.mutrapro.com/errors/FILE_6001",
        "File size exceeds maximum allowed size",
        Retryable.NON_TRANSIENT),
    
    FILE_TYPE_NOT_ALLOWED("FILE_6002", 400,
        "https://docs.mutrapro.com/errors/FILE_6002",
        "File type is not allowed",
        Retryable.NON_TRANSIENT),
    
    FILE_UPLOAD_FAILED("FILE_6003", 500,
        "https://docs.mutrapro.com/errors/FILE_6003",
        "Failed to upload file",
        Retryable.TRANSIENT),
    
    FILE_READ_ERROR("FILE_6004", 500,
        "https://docs.mutrapro.com/errors/FILE_6004",
        "Error reading file",
        Retryable.TRANSIENT),
    
    USER_NOT_AUTHENTICATED("REQUEST_6005", 401,
        "https://docs.mutrapro.com/errors/REQUEST_6005",
        "User not authenticated",
        Retryable.NON_TRANSIENT),
    
    RESOURCE_NOT_FOUND("REQUEST_6006", 404,
        "https://docs.mutrapro.com/errors/REQUEST_6006",
        "Resource not found",
        Retryable.NON_TRANSIENT),
    
    INSTRUMENT_NAME_DUPLICATE("REQUEST_6007", 409,
        "https://docs.mutrapro.com/errors/REQUEST_6007",
        "Instrument name already exists",
        Retryable.NON_TRANSIENT),
    
    INSTRUMENTS_REQUIRED("REQUEST_6008", 400,
        "https://docs.mutrapro.com/errors/REQUEST_6008",
        "At least one notation instrument is required for this request type",
        Retryable.NON_TRANSIENT),
    
    INSTRUMENT_USAGE_NOT_COMPATIBLE("REQUEST_6009", 400,
        "https://docs.mutrapro.com/errors/REQUEST_6009",
        "Instrument usage is not compatible with request type",
        Retryable.NON_TRANSIENT),
    
    FILE_TYPE_NOT_SUPPORTED_FOR_REQUEST("REQUEST_6010", 400,
        "https://docs.mutrapro.com/errors/REQUEST_6010",
        "File type is not supported for this request type",
        Retryable.NON_TRANSIENT),
    
    CANNOT_ASSIGN_TO_OTHER_MANAGER("REQUEST_6011", 403,
        "https://docs.mutrapro.com/errors/REQUEST_6011",
        "Manager can only assign requests to themselves when self-assigning",
        Retryable.NON_TRANSIENT),
    
    REQUEST_ALREADY_HAS_MANAGER("REQUEST_6012", 409,
        "https://docs.mutrapro.com/errors/REQUEST_6012",
        "Service request already has a manager assigned",
        Retryable.NON_TRANSIENT),
    
    DUPLICATE_RESOURCE("REQUEST_6013", 409,
        "https://docs.mutrapro.com/errors/REQUEST_6013",
        "Resource already exists",
        Retryable.NON_TRANSIENT),
    
    DURATION_REQUIRED("REQUEST_6014", 400,
        "https://docs.mutrapro.com/errors/REQUEST_6014",
        "Duration minutes is required for transcription",
        Retryable.NON_TRANSIENT);

    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;

    RequestServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }

    RequestServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
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

