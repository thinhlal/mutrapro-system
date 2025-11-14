package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Exception khi số dư ví không đủ
 */
public class InsufficientBalanceException extends BusinessException {

    public InsufficientBalanceException(String message) {
        super(BillingServiceErrorCodes.INSUFFICIENT_BALANCE, message);
    }

    public InsufficientBalanceException(String message, String walletId, BigDecimal balance, BigDecimal requiredAmount) {
        super(BillingServiceErrorCodes.INSUFFICIENT_BALANCE, message, 
              Map.of(
                  "walletId", walletId != null ? walletId : "unknown",
                  "balance", balance != null ? balance.toString() : "0",
                  "requiredAmount", requiredAmount != null ? requiredAmount.toString() : "0"
              ));
    }
    
    public static InsufficientBalanceException create(String walletId, BigDecimal balance, BigDecimal requiredAmount) {
        return new InsufficientBalanceException(
            String.format("Insufficient balance: wallet has %s but requires %s", balance, requiredAmount),
            walletId, balance, requiredAmount
        );
    }
}

