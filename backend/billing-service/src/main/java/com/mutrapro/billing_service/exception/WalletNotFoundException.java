package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy wallet
 */
public class WalletNotFoundException extends ResourceNotFoundException {

    public WalletNotFoundException(String message) {
        super(BillingServiceErrorCodes.WALLET_NOT_FOUND, message);
    }

    public WalletNotFoundException(String message, String walletId) {
        super(BillingServiceErrorCodes.WALLET_NOT_FOUND, message, 
              Map.of("walletId", walletId != null ? walletId : "unknown"));
    }
    
    public static WalletNotFoundException byId(String walletId) {
        return new WalletNotFoundException(
            "Wallet not found with id: " + walletId,
            walletId
        );
    }
    
    public static WalletNotFoundException byUserId(String userId) {
        return new WalletNotFoundException(
            "Wallet not found for user: " + userId,
            null
        );
    }
}

