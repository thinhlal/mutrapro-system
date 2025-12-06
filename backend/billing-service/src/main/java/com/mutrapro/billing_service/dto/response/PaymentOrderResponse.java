package com.mutrapro.billing_service.dto.response;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.PaymentOrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class PaymentOrderResponse {
    
    String paymentOrderId;
    String walletId;
    BigDecimal amount;
    CurrencyType currency;
    PaymentOrderStatus status;
    String sepayTransactionId;
    String virtualAccount;  // Virtual Account (VA) để nhận tiền
    String qrCodeUrl;  // URL của QR code để hiển thị
    String description;
    LocalDateTime expiresAt;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    LocalDateTime completedAt;
}

