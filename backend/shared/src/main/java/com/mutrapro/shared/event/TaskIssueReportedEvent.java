package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi specialist báo issue / không kịp deadline cho task.
 * Notification-service lắng nghe để tạo in-app notification cho manager.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskIssueReportedEvent implements Serializable {

    UUID eventId;
    String assignmentId;
    String contractId;
    String contractNumber;
    String managerUserId;  // Manager cần nhận notification
    
    String specialistId;
    String specialistUserId;
    String taskType;
    String milestoneId;
    String milestoneName;
    
    String reason;  // Lý do báo issue
    
    String title;
    String content;
    String referenceType;  // "TASK_ASSIGNMENT"
    String actionUrl;
    
    Instant reportedAt;
    Instant timestamp;
}

