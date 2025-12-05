package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Event khi submission được deliver cho customer (tất cả files trong submission đã được delivered).
 * Notification-service lắng nghe để tạo in-app notification cho customer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionDeliveredEvent implements Serializable {

    UUID eventId;
    String submissionId;
    String submissionName;
    String assignmentId;
    String milestoneId;
    String milestoneName;
    String contractId;
    String contractNumber;
    String customerUserId;  // Customer cần nhận notification
    
    List<String> fileIds;  // Danh sách file IDs trong submission
    List<String> fileNames;  // Danh sách file names trong submission
    
    String title;
    String content;
    String referenceType;
    String actionUrl;
    
    LocalDateTime deliveredAt;
    LocalDateTime timestamp;
}

