package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Exception khi số tiền giao dịch không hợp lệ
 */
public class InvalidAmountException extends BusinessException {

  public InvalidAmountException(String message) {
    super(BillingServiceErrorCodes.INVALID_AMOUNT, message);
  }

  public InvalidAmountException(String message, BigDecimal amount) {
    super(BillingServiceErrorCodes.INVALID_AMOUNT, message,
        Map.of(
            "amount", amount != null ? amount.toString() : "null"));
  }

  public static InvalidAmountException forTopup(BigDecimal amount) {
    return new InvalidAmountException(
        "Số tiền nạp phải lớn hơn 0",
        amount);
  }

  public static InvalidAmountException forDebit(BigDecimal amount) {
    return new InvalidAmountException(
        "Số tiền trừ phải lớn hơn 0",
        amount);
  }
}
