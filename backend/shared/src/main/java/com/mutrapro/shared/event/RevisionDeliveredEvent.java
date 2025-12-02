package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi revision được deliver cho customer (manager đã deliver revision sau khi specialist làm xong).
 * Notification-service lắng nghe để tạo in-app notification cho customer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionDeliveredEvent implements Serializable {

    UUID eventId;
    String revisionRequestId;
    String submissionId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    String customerUserId;  // Customer cần nhận notification
    
    Integer revisionRound;
    Boolean isFreeRevision;
    
    String title;
    String content;
    String referenceType;  // "REVISION_REQUEST"
    String actionUrl;
    
    Instant deliveredAt;
    Instant timestamp;
}

