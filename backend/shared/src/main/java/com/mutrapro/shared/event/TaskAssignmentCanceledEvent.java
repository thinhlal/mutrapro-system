package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi task assignment bị hủy (bởi specialist hoặc manager).
 * Notification-service lắng nghe để tạo in-app notification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskAssignmentCanceledEvent implements Serializable {

    UUID eventId;
    String assignmentId;
    String contractId;
    String contractNumber;
    
    // Người nhận notification
    String userId;  // managerUserId hoặc specialistUserId
    
    String specialistId;
    String specialistUserId;
    String taskType;
    String milestoneId;
    String milestoneName;
    
    String reason;  // Lý do hủy
    String canceledBy;  // "SPECIALIST" hoặc "MANAGER"
    
    String title;
    String content;
    String referenceType;  // "TASK_ASSIGNMENT"
    String actionUrl;
    
    Instant canceledAt;
    Instant timestamp;
}

