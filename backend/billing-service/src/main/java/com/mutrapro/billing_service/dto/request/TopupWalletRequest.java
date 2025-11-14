package com.mutrapro.billing_service.dto.request;

import com.mutrapro.billing_service.enums.CurrencyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class TopupWalletRequest {
    
    @NotNull(message = "Số tiền nạp không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền nạp tối thiểu là 1,000 VND")
    BigDecimal amount;
    
    CurrencyType currency;  // Optional, default VND
    
    // Thông tin payment gateway (SePay, VNPay, etc.) - optional
    String paymentMethod;  // "sepay_qr", "banking", etc.
    String transactionId;  // Transaction ID từ payment gateway
    String gatewayResponse;  // Response từ payment gateway (JSON string)
}

