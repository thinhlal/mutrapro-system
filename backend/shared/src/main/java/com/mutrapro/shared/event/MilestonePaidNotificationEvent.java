package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi milestone được thanh toán - dùng cho notification.
 * Khác với MilestonePaidEvent (dùng cho billing service).
 * Notification-service lắng nghe để tạo in-app notification cho manager.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MilestonePaidNotificationEvent implements Serializable {

    UUID eventId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String managerUserId;  // Manager cần nhận notification
    
    BigDecimal amount;
    String currency;  // VND, USD, etc.
    
    String title;
    String content;
    String referenceType;  // "CONTRACT"
    String actionUrl;
    
    Instant paidAt;
    Instant timestamp;
}

