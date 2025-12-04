package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Base event cho các contract notifications.
 * Notification-service lắng nghe để tạo in-app notification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractNotificationEvent implements Serializable {

    UUID eventId;
    String contractId;
    String contractNumber;
    String userId;  // Người nhận notification (customer hoặc manager)
    
    String notificationType;  // CONTRACT_SENT, CONTRACT_APPROVED, CONTRACT_NEED_REVISION, etc.
    String title;
    String content;
    String referenceType;  // "CONTRACT"
    String actionUrl;
    
    String reason;  // Optional: lý do (cho revision, cancellation, etc.)
    
    Instant timestamp;
}

