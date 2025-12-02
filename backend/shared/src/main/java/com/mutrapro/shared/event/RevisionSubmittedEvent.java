package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi specialist submit revision cho manager review.
 * Notification-service lắng nghe để tạo in-app notification cho manager.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionSubmittedEvent implements Serializable {

    UUID eventId;
    String revisionRequestId;
    String submissionId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    String specialistId;
    String specialistUserId;
    String managerUserId;  // Manager cần nhận notification
    
    Integer revisionRound;
    Boolean isFreeRevision;
    
    String title;
    String content;
    String referenceType;  // "REVISION_REQUEST"
    String actionUrl;
    
    Instant submittedAt;
    Instant timestamp;
}

