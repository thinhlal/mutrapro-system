package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.ForbiddenException;

/**
 * Exception khi không có quyền truy cập ví
 */
public class UnauthorizedWalletAccessException extends ForbiddenException {

    public UnauthorizedWalletAccessException(String message) {
        super(BillingServiceErrorCodes.UNAUTHORIZED_WALLET_ACCESS, message);
    }

    public UnauthorizedWalletAccessException(String message, String walletId) {
        super(BillingServiceErrorCodes.UNAUTHORIZED_WALLET_ACCESS, message, 
              "walletId", walletId != null ? walletId : "unknown");
    }
    
    public static UnauthorizedWalletAccessException create(String walletId) {
        return new UnauthorizedWalletAccessException(
            "Unauthorized access to wallet: " + walletId,
            walletId
        );
    }
}

