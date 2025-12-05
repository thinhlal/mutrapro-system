package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event khi task assignment được activate (chuyển từ accepted_waiting → ready_to_start).
 * Xảy ra khi milestone được unlock (milestone trước đã được thanh toán hoặc contract bắt đầu).
 * Notification-service lắng nghe để tạo in-app notification cho specialist.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskAssignmentReadyToStartEvent implements Serializable {

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

    LocalDateTime timestamp;
}

