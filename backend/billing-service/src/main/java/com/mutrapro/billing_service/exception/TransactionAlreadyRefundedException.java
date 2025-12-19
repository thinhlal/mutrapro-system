package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi transaction đã được refund rồi
 */
public class TransactionAlreadyRefundedException extends BusinessException {

    public TransactionAlreadyRefundedException(String message) {
        super(BillingServiceErrorCodes.TRANSACTION_ALREADY_REFUNDED, message);
    }

    public TransactionAlreadyRefundedException(String message, String transactionId) {
        super(BillingServiceErrorCodes.TRANSACTION_ALREADY_REFUNDED, message, 
              Map.of("transactionId", transactionId != null ? transactionId : "unknown"));
    }
    
    public static TransactionAlreadyRefundedException create(String transactionId) {
        return new TransactionAlreadyRefundedException(
            "Transaction has already been refunded: " + transactionId,
            transactionId
        );
    }
}

