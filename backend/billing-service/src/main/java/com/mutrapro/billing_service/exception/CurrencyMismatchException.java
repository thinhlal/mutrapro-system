package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi loại tiền tệ không khớp giữa ví và giao dịch
 */
public class CurrencyMismatchException extends BusinessException {

  public CurrencyMismatchException(String message) {
    super(BillingServiceErrorCodes.CURRENCY_MISMATCH, message);
  }

  public CurrencyMismatchException(String message, CurrencyType walletCurrency, CurrencyType transactionCurrency) {
    super(BillingServiceErrorCodes.CURRENCY_MISMATCH, message,
        Map.of(
            "walletCurrency", walletCurrency != null ? walletCurrency.name() : "null",
            "transactionCurrency", transactionCurrency != null ? transactionCurrency.name() : "null"));
  }

  public static CurrencyMismatchException create(CurrencyType walletCurrency, CurrencyType transactionCurrency) {
    return new CurrencyMismatchException(
        String.format("Loại tiền tệ không khớp với ví: ví sử dụng %s nhưng giao dịch yêu cầu %s",
            walletCurrency != null ? walletCurrency.name() : "null",
            transactionCurrency != null ? transactionCurrency.name() : "null"),
        walletCurrency,
        transactionCurrency);
  }
}
