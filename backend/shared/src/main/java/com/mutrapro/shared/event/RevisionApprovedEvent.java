package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi manager approve revision request.
 * Notification-service lắng nghe để tạo in-app notification cho specialist.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionApprovedEvent implements Serializable {

    UUID eventId;
    String revisionRequestId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    String specialistId;
    String specialistUserId;  // Specialist cần nhận notification
    String managerUserId;
    
    Integer revisionRound;
    Boolean isFreeRevision;
    String managerNote;
    
    String title;
    String content;
    String referenceType;  // "REVISION_REQUEST"
    String actionUrl;
    
    LocalDateTime approvedAt;
    LocalDateTime timestamp;
}

