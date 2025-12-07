package com.mutrapro.specialist_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * Specialist Service Error Codes
 * Range: 8000-8999
 */
public enum SpecialistServiceErrorCodes implements ErrorCode {

    // Specialist Errors (8000-8049)
    SPECIALIST_NOT_FOUND("SPECIALIST_8000", 404,
        "https://docs.mutrapro.com/errors/SPECIALIST_8000",
        "Specialist not found",
        Retryable.NON_TRANSIENT),
    
    SPECIALIST_ALREADY_EXISTS("SPECIALIST_8001", 409,
        "https://docs.mutrapro.com/errors/SPECIALIST_8001",
        "Specialist already exists for this user",
        Retryable.NON_TRANSIENT),
    
    ACCESS_DENIED("SPECIALIST_8002", 403,
        "https://docs.mutrapro.com/errors/SPECIALIST_8002",
        "Access denied. You can only access your own resources",
        Retryable.NON_TRANSIENT),
    
    // Skill Errors (8050-8099)
    SKILL_NOT_FOUND("SPECIALIST_8050", 404,
        "https://docs.mutrapro.com/errors/SPECIALIST_8050",
        "Skill not found",
        Retryable.NON_TRANSIENT),
    
    SPECIALIST_SKILL_NOT_FOUND("SPECIALIST_8051", 404,
        "https://docs.mutrapro.com/errors/SPECIALIST_8051",
        "Specialist skill not found",
        Retryable.NON_TRANSIENT),
    
    SKILL_ALREADY_EXISTS("SPECIALIST_8052", 409,
        "https://docs.mutrapro.com/errors/SPECIALIST_8052",
        "Skill already exists for this specialist",
        Retryable.NON_TRANSIENT),
    
    SKILL_IN_USE("SPECIALIST_8053", 400,
        "https://docs.mutrapro.com/errors/SPECIALIST_8053",
        "Cannot delete skill. Skill is currently being used by specialists or demos",
        Retryable.NON_TRANSIENT),
    
    // Demo Errors (8100-8149)
    DEMO_NOT_FOUND("SPECIALIST_8100", 404,
        "https://docs.mutrapro.com/errors/SPECIALIST_8100",
        "Demo not found",
        Retryable.NON_TRANSIENT),
    
    // Validation Errors (8150-8199)
    INVALID_SPECIALIST_REQUEST("SPECIALIST_8150", 400,
        "https://docs.mutrapro.com/errors/SPECIALIST_8150",
        "Invalid specialist request",
        Retryable.NON_TRANSIENT),
    
    INVALID_SPECIALIST_TYPE("SPECIALIST_8151", 400,
        "https://docs.mutrapro.com/errors/SPECIALIST_8151",
        "Invalid specialist type",
        Retryable.NON_TRANSIENT),
    
    INVALID_RECORDING_ROLE("SPECIALIST_8152", 400,
        "https://docs.mutrapro.com/errors/SPECIALIST_8152",
        "Invalid recording role configuration",
        Retryable.NON_TRANSIENT),
    
    // External Service Errors (8200-8249)
    USER_NOT_FOUND("SPECIALIST_8200", 404,
        "https://docs.mutrapro.com/errors/SPECIALIST_8200",
        "User not found",
        Retryable.NON_TRANSIENT),
    
    USER_ROLE_UPDATE_FAILED("SPECIALIST_8201", 500,
        "https://docs.mutrapro.com/errors/SPECIALIST_8201",
        "Failed to update user role",
        Retryable.TRANSIENT),
    
    // Authentication Errors (8250-8299)
    USER_NOT_AUTHENTICATED("SPECIALIST_8250", 401,
        "https://docs.mutrapro.com/errors/SPECIALIST_8250",
        "User not authenticated",
        Retryable.NON_TRANSIENT),
    
    USER_ID_NOT_FOUND("SPECIALIST_8251", 401,
        "https://docs.mutrapro.com/errors/SPECIALIST_8251",
        "User ID not found in JWT token",
        Retryable.NON_TRANSIENT);

    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;

    SpecialistServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }

    SpecialistServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
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

