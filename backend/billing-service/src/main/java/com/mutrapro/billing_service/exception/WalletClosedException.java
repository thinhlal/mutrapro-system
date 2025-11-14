package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi ví đã đóng
 */
public class WalletClosedException extends BusinessException {

    public WalletClosedException(String message) {
        super(BillingServiceErrorCodes.WALLET_CLOSED, message);
    }

    public WalletClosedException(String message, String walletId) {
        super(BillingServiceErrorCodes.WALLET_CLOSED, message, 
              "walletId", walletId != null ? walletId : "unknown");
    }
    
    public static WalletClosedException create(String walletId) {
        return new WalletClosedException(
            "Wallet is closed and cannot perform transactions: " + walletId,
            walletId
        );
    }
}

