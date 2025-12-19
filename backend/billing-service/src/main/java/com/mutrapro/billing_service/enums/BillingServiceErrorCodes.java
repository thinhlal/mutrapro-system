package com.mutrapro.billing_service.enums;

import com.mutrapro.shared.exception.ErrorCode;
import com.mutrapro.shared.exception.Retryable;

/**
 * Billing Service Error Codes
 * Range: 8000-8999
 */
public enum BillingServiceErrorCodes implements ErrorCode {

    // Wallet Errors (8000-8099)
    WALLET_NOT_FOUND("WALLET_8000", 404,
        "https://docs.mutrapro.com/errors/WALLET_8000",
        "Wallet not found",
        Retryable.NON_TRANSIENT),
    
    WALLET_ALREADY_EXISTS("WALLET_8001", 409,
        "https://docs.mutrapro.com/errors/WALLET_8001",
        "Wallet already exists for this user",
        Retryable.NON_TRANSIENT),
    
    INSUFFICIENT_BALANCE("WALLET_8002", 400,
        "https://docs.mutrapro.com/errors/WALLET_8002",
        "Insufficient wallet balance",
        Retryable.NON_TRANSIENT),
    
    WALLET_LOCKED("WALLET_8003", 403,
        "https://docs.mutrapro.com/errors/WALLET_8003",
        "Wallet is locked and cannot perform transactions",
        Retryable.NON_TRANSIENT),
    
    WALLET_CLOSED("WALLET_8004", 403,
        "https://docs.mutrapro.com/errors/WALLET_8004",
        "Wallet is closed and cannot perform transactions",
        Retryable.NON_TRANSIENT),
    
    INVALID_AMOUNT("WALLET_8005", 400,
        "https://docs.mutrapro.com/errors/WALLET_8005",
        "Invalid transaction amount",
        Retryable.NON_TRANSIENT),
    
    UNAUTHORIZED_WALLET_ACCESS("WALLET_8006", 403,
        "https://docs.mutrapro.com/errors/WALLET_8006",
        "Unauthorized access to wallet",
        Retryable.NON_TRANSIENT),
    
    USER_NOT_AUTHENTICATED("WALLET_8007", 401,
        "https://docs.mutrapro.com/errors/WALLET_8007",
        "User not authenticated",
        Retryable.NON_TRANSIENT),
    
    CURRENCY_MISMATCH("WALLET_8008", 400,
        "https://docs.mutrapro.com/errors/WALLET_8008",
        "Currency mismatch between wallet and transaction",
        Retryable.NON_TRANSIENT),
    
    // Withdrawal Request Errors (8100-8199)
    WITHDRAWAL_REQUEST_NOT_FOUND("WITHDRAWAL_8100", 404,
        "https://docs.mutrapro.com/errors/WITHDRAWAL_8100",
        "Withdrawal request not found",
        Retryable.NON_TRANSIENT),
    
    INVALID_WITHDRAWAL_STATUS("WITHDRAWAL_8101", 400,
        "https://docs.mutrapro.com/errors/WITHDRAWAL_8101",
        "Invalid withdrawal request status for this operation",
        Retryable.NON_TRANSIENT),
    
    INVALID_PROOF_FILE("WITHDRAWAL_8102", 400,
        "https://docs.mutrapro.com/errors/WITHDRAWAL_8102",
        "Invalid proof file format or size",
        Retryable.NON_TRANSIENT),
    
    PROOF_FILE_UPLOAD_FAILED("WITHDRAWAL_8103", 500,
        "https://docs.mutrapro.com/errors/WITHDRAWAL_8103",
        "Failed to upload proof file",
        Retryable.TRANSIENT),
    
    PROOF_FILE_DOWNLOAD_FAILED("WITHDRAWAL_8104", 500,
        "https://docs.mutrapro.com/errors/WITHDRAWAL_8104",
        "Failed to download proof file",
        Retryable.TRANSIENT),
    
    // Transaction Errors (8200-8299)
    INVALID_TRANSACTION_TYPE("TRANSACTION_8200", 400,
        "https://docs.mutrapro.com/errors/TRANSACTION_8200",
        "Invalid transaction type for this operation",
        Retryable.NON_TRANSIENT),
    
    TRANSACTION_ALREADY_REFUNDED("TRANSACTION_8201", 409,
        "https://docs.mutrapro.com/errors/TRANSACTION_8201",
        "Transaction has already been refunded",
        Retryable.NON_TRANSIENT);

    private final String code;
    private final int httpStatus;
    private final String type;
    private final String description;
    private final Retryable retryable;
    private final long retryAfterSeconds;

    BillingServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable) {
        this(code, httpStatus, type, description, retryable, 30);
    }

    BillingServiceErrorCodes(String code, int httpStatus, String type, String description, Retryable retryable, long retryAfterSeconds) {
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

