package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi specialist upload file output cho task.
 * Notification-service lắng nghe để tạo in-app notification cho manager.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskFileUploadedEvent implements Serializable {

    UUID eventId;
    String fileId;
    String fileName;
    String assignmentId;
    String contractId;
    String contractNumber;
    String taskType;
    String managerUserId;  // Manager cần nhận notification
    
    String title;
    String content;
    String referenceType;
    String actionUrl;
    
    Instant uploadedAt;
    Instant timestamp;
}

