package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi manager reject submission lần đầu (không phải revision).
 * Notification-service lắng nghe để tạo in-app notification cho specialist.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionRejectedEvent implements Serializable {

    UUID eventId;
    String submissionId;
    String submissionName;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    String specialistId;
    String specialistUserId;  // Specialist cần nhận notification
    String managerUserId;
    String rejectionReason;  // Lý do reject từ manager
    
    String taskType;
    Integer fileCount;
    
    String title;
    String content;
    String referenceType;  // "SUBMISSION"
    String actionUrl;
    
    LocalDateTime rejectedAt;
    LocalDateTime timestamp;
}

