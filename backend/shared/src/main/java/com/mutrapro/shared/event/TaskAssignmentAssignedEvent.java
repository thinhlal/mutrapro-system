package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi manager gán task cho specialist.
 * Notification-service lắng nghe để tạo in-app notification.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskAssignmentAssignedEvent implements Serializable {

    UUID eventId;
    String assignmentId;
    String contractId;
    String contractNumber;
    String specialistId;
    String specialistUserId;

    String taskType;
    String milestoneId;
    String milestoneName;

    String title;
    String content;
    String referenceType;
    String actionUrl;

    LocalDateTime assignedAt;
    LocalDateTime timestamp;
}


