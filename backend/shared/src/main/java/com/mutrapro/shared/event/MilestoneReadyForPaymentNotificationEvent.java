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
 * Event khi milestone sẵn sàng thanh toán (customer đã accept submission).
 * Notification-service lắng nghe để tạo in-app notification cho customer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestoneReadyForPaymentNotificationEvent implements Serializable {

    UUID eventId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String customerUserId;  // Customer cần nhận notification
    
    BigDecimal amount;
    String currency;  // VND, USD, etc.
    
    String title;
    String content;
    String referenceType;  // "CONTRACT"
    String actionUrl;
    
    LocalDateTime timestamp;
}

