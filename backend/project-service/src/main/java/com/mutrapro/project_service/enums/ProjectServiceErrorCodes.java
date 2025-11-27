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
        Retryable.NON_TRANSIENT),
    
    // E-Signature Errors (7010-7019)
    SIGN_SESSION_NOT_FOUND("CONTRACT_7010", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7010",
        "Sign session not found or expired",
        Retryable.NON_TRANSIENT),
    
    INVALID_OTP("CONTRACT_7011", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7011",
        "Invalid or expired OTP code",
        Retryable.NON_TRANSIENT),
    
    MAX_OTP_ATTEMPTS_EXCEEDED("CONTRACT_7012", 429,
        "https://docs.mutrapro.com/errors/CONTRACT_7012",
        "Maximum OTP verification attempts exceeded",
        Retryable.NON_TRANSIENT),
    
    SIGNATURE_UPLOAD_FAILED("CONTRACT_7013", 500,
        "https://docs.mutrapro.com/errors/CONTRACT_7013",
        "Failed to upload signature to storage",
        Retryable.TRANSIENT),
    
    SIGNATURE_IMAGE_NOT_FOUND("CONTRACT_7014", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7014",
        "Signature image not found for contract",
        Retryable.NON_TRANSIENT),
    
    // Contract Milestone Errors (7015-7019)
    CONTRACT_MILESTONE_NOT_FOUND("CONTRACT_7015", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7015",
        "Contract milestone not found",
        Retryable.NON_TRANSIENT),
    
    INVALID_MILESTONE_WORK_STATUS("CONTRACT_7016", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7016",
        "Invalid milestone work status for the requested action",
        Retryable.NON_TRANSIENT),
    
    // Task Assignment Errors (7020-7029)
    INVALID_TASK_TYPE("CONTRACT_7020", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7020",
        "Task type is not valid for the contract type",
        Retryable.NON_TRANSIENT),
    
    TASK_ASSIGNMENT_ALREADY_COMPLETED("CONTRACT_7021", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7021",
        "Task assignment is already completed and cannot be modified",
        Retryable.NON_TRANSIENT),
    
    INVALID_MILESTONE_ID("CONTRACT_7022", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7022",
        "Milestone ID cannot be blank",
        Retryable.NON_TRANSIENT),
    
    CONTRACT_VALIDATION_ERROR("CONTRACT_7023", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7023",
        "Contract validation failed",
        Retryable.NON_TRANSIENT),
    
    MILESTONE_PAYMENT_ERROR("CONTRACT_7024", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7024",
        "Milestone payment error",
        Retryable.NON_TRANSIENT),
    
    CONTRACT_INSTALLMENT_NOT_FOUND("CONTRACT_7025", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7025",
        "Contract installment not found",
        Retryable.NON_TRANSIENT),
    
    INVALID_INSTALLMENT_TYPE("CONTRACT_7026", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7026",
        "Invalid installment type",
        Retryable.NON_TRANSIENT),
    
    MISSING_REASON("CONTRACT_7027", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7027",
        "Reason is required",
        Retryable.NON_TRANSIENT),
    
    SIGNATURE_RETRIEVE_ERROR("CONTRACT_7028", 500,
        "https://docs.mutrapro.com/errors/CONTRACT_7028",
        "Failed to retrieve signature image",
        Retryable.TRANSIENT),
    
    CONTRACT_PDF_UPLOAD_ERROR("CONTRACT_7029", 500,
        "https://docs.mutrapro.com/errors/CONTRACT_7029",
        "Failed to upload contract PDF",
        Retryable.TRANSIENT),
    
    // File Upload Errors (7030-7039)
    FILE_UPLOAD_ERROR("CONTRACT_7030", 500,
        "https://docs.mutrapro.com/errors/CONTRACT_7030",
        "Failed to upload file",
        Retryable.TRANSIENT),
    
    FILE_EMPTY("CONTRACT_7031", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7031",
        "File is empty",
        Retryable.NON_TRANSIENT),
    
    TASK_ASSIGNMENT_NOT_FOUND("CONTRACT_7032", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7032",
        "Task assignment not found",
        Retryable.NON_TRANSIENT),
    
    FILE_NOT_FOUND("CONTRACT_7034", 404,
        "https://docs.mutrapro.com/errors/CONTRACT_7034",
        "File not found",
        Retryable.NON_TRANSIENT),
    
    INVALID_FILE_TYPE_FOR_TASK("CONTRACT_7033", 400,
        "https://docs.mutrapro.com/errors/CONTRACT_7033",
        "File type is not allowed for this task type",
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

