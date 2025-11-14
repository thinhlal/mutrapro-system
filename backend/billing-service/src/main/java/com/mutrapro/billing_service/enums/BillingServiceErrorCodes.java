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

