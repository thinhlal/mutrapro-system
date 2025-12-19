package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.billing_service.enums.WalletTxType;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi transaction type không hợp lệ cho operation
 */
public class InvalidTransactionTypeException extends BusinessException {

    public InvalidTransactionTypeException(String message) {
        super(BillingServiceErrorCodes.INVALID_TRANSACTION_TYPE, message);
    }

    public InvalidTransactionTypeException(String message, String transactionId, WalletTxType currentType, WalletTxType expectedType) {
        super(BillingServiceErrorCodes.INVALID_TRANSACTION_TYPE, message, 
              Map.of(
                  "transactionId", transactionId != null ? transactionId : "unknown",
                  "currentType", currentType != null ? currentType.name() : "unknown",
                  "expectedType", expectedType != null ? expectedType.name() : "unknown"
              ));
    }
    
    public static InvalidTransactionTypeException forOperation(String transactionId, WalletTxType currentType, WalletTxType expectedType) {
        return new InvalidTransactionTypeException(
            String.format("Transaction is not of expected type. Transaction ID: %s, Current type: %s, Expected type: %s", 
                transactionId, currentType != null ? currentType.name() : "unknown", expectedType != null ? expectedType.name() : "unknown"),
            transactionId, currentType, expectedType
        );
    }
}

