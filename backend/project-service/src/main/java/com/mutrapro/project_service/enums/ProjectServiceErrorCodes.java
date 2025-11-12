package com.mutrapro.project_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * Project Service Error Codes
 * Range: 7000-7999
 */
public enum ProjectServiceErrorCodes implements ErrorCode {

    // Contract Errors (7000-7099)
    INVALID_REQUEST_ID("CONTRACT_7000", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7000",
        "Request ID is required to create a contract",
        Retryable.NON_TRANSIENT),
    
    SERVICE_REQUEST_NOT_FOUND("CONTRACT_7001", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7001",
        "Service request not found",
        Retryable.NON_TRANSIENT),
    
    CONTRACT_NOT_FOUND("CONTRACT_7002", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7002",
        "Contract not found",
        Retryable.NON_TRANSIENT),
    
    CONTRACT_ALREADY_EXISTS("CONTRACT_7003", 409,
        "https://docs.mutrapro.com/errors/CONTRACT_7003",
        "Contract already exists for this request",
        Retryable.NON_TRANSIENT),
    
    UNAUTHORIZED("CONTRACT_7004", 403,
        "https://docs.mutrapro.com/errors/CONTRACT_7004",
        "Unauthorized access",
        Retryable.NON_TRANSIENT),
    
    USER_NOT_AUTHENTICATED("CONTRACT_7005", 401,
        "https://docs.mutrapro.com/errors/CONTRACT_7005",
        "User not authenticated",
        Retryable.NON_TRANSIENT),
    
    CONTRACT_EXPIRED("CONTRACT_7006", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7006",
        "Contract has expired and cannot be signed",
        Retryable.NON_TRANSIENT),
    
    CONTRACT_ALREADY_SIGNED("CONTRACT_7007", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7007",
        "Cannot modify a signed contract",
        Retryable.NON_TRANSIENT),
    
    INVALID_CONTRACT_STATUS("CONTRACT_7008", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7008",
        "Invalid contract status for the requested action",
        Retryable.NON_TRANSIENT),
    
    INVALID_REQUEST_STATUS("CONTRACT_7009", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7009",
        "Invalid request status for creating contract",
        Retryable.NON_TRANSIENT);

    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;

    ProjectServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }

    ProjectServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
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

