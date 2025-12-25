package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Exception khi số tiền điều chỉnh không hợp lệ (bằng 0 hoặc trừ quá số dư)
 */
public class InvalidAdjustmentAmountException extends BusinessException {

    public InvalidAdjustmentAmountException(String message) {
        super(BillingServiceErrorCodes.INVALID_AMOUNT, message);
    }

    public InvalidAdjustmentAmountException(String message, BigDecimal amount, BigDecimal currentBalance) {
        super(BillingServiceErrorCodes.INVALID_AMOUNT, message,
              Map.of(
                  "amount", amount != null ? amount.toString() : "null",
                  "currentBalance", currentBalance != null ? currentBalance.toString() : "0"
              ));
    }

    /**
     * Exception khi số tiền điều chỉnh bằng 0
     */
    public static InvalidAdjustmentAmountException zeroAmount() {
        return new InvalidAdjustmentAmountException(
            "Số tiền điều chỉnh phải khác 0"
        );
    }

    /**
     * Exception khi trừ tiền mà số dư không đủ
     */
    public static InvalidAdjustmentAmountException insufficientBalance(BigDecimal amount, BigDecimal currentBalance) {
        return new InvalidAdjustmentAmountException(
            String.format("Không thể trừ tiền. Số dư hiện tại: %s, số tiền trừ: %s", 
                    currentBalance, amount.abs()),
            amount, currentBalance
        );
    }
}

