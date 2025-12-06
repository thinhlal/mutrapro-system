package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi payment order được thanh toán thành công - dùng cho notification.
 * Notification-service lắng nghe để tạo in-app notification cho user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderCompletedNotificationEvent implements Serializable {

    UUID eventId;
    String paymentOrderId;
    String walletId;
    String userId;  // User cần nhận notification
    
    BigDecimal amount;
    String currency;  // VND, USD, etc.
    
    String title;
    String content;
    String referenceType;  // "PAYMENT"
    String referenceId;  // paymentOrderId
    String actionUrl;
    
    LocalDateTime completedAt;
    LocalDateTime timestamp;
}

