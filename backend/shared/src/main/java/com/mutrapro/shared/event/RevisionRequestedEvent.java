package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi customer yêu cầu revision (chỉnh sửa).
 * Notification-service lắng nghe để tạo in-app notification cho manager.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionRequestedEvent implements Serializable {

    UUID eventId;
    String revisionRequestId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    String customerUserId;
    String managerUserId;  // Manager cần nhận notification
    
    String title;
    String description;
    Integer revisionRound;
    Boolean isFreeRevision;
    
    String referenceType;  // "REVISION_REQUEST"
    String actionUrl;
    
    Instant requestedAt;
    Instant timestamp;
}

