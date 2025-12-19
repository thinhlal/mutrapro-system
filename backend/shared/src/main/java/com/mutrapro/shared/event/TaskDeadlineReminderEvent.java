package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event nhắc hạn task (sắp đến deadline) để notification-service tạo in-app notification.
 *
 * Idempotency: notification-service dedupe theo eventId (ConsumedEvent).
 * Project-service scheduler nên generate eventId deterministic theo (assignmentId + reminderDays + targetDeadlineDate)
 * để tránh spam.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDeadlineReminderEvent implements Serializable {

    UUID eventId;

    String assignmentId;
    String contractId;
    String contractNumber;

    String specialistId;
    String specialistUserId;

    String taskType;
    String milestoneId;
    String milestoneName;

    LocalDateTime targetDeadline;
    Integer reminderDays; // số ngày còn lại (3, 1, 0)

    String title;
    String content;
    String referenceType;
    String actionUrl;

    LocalDateTime timestamp;
}


