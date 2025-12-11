package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi specialist submit file lần đầu cho manager review (không phải revision).
 * Notification-service lắng nghe để tạo in-app notification cho manager.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionSubmittedEvent implements Serializable {

    UUID eventId;
    String submissionId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    String specialistId;
    String specialistUserId;
    String managerUserId;  // Manager cần nhận notification
    
    String submissionName;
    String taskType;
    Integer fileCount;
    
    String title;
    String content;
    String referenceType;  // "SUBMISSION"
    String actionUrl;
    
    LocalDateTime submittedAt;
    LocalDateTime timestamp;
}

