package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi ví bị khóa
 */
public class WalletLockedException extends BusinessException {

    public WalletLockedException(String message) {
        super(BillingServiceErrorCodes.WALLET_LOCKED, message);
    }

    public WalletLockedException(String message, String walletId) {
        super(BillingServiceErrorCodes.WALLET_LOCKED, message, 
              "walletId", walletId != null ? walletId : "unknown");
    }
    
    public static WalletLockedException create(String walletId) {
        return new WalletLockedException(
            "Wallet is locked and cannot perform transactions: " + walletId,
            walletId
        );
    }
}

