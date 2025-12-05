package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi manager reject revision request hoặc reject revision submission.
 * Notification-service lắng nghe để tạo in-app notification cho customer hoặc specialist.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionRejectedEvent implements Serializable {

    UUID eventId;
    String revisionRequestId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    
    // Người nhận notification (có thể là customer hoặc specialist)
    String recipientUserId;
    String recipientType;  // "CUSTOMER" hoặc "SPECIALIST"
    
    String managerUserId;
    String managerNote;
    
    Integer revisionRound;
    Boolean isFreeRevision;
    String paidWalletTxId;  // ID của wallet transaction nếu là paid revision (cần refund khi reject)
    
    String title;
    String content;
    String referenceType;  // "REVISION_REQUEST"
    String actionUrl;
    
    LocalDateTime rejectedAt;
    LocalDateTime timestamp;
}

