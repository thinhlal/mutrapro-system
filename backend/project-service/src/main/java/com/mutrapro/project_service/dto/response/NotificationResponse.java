package com.mutrapro.project_service.dto.response;

import com.mutrapro.shared.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for Notification (from notification-service)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    
    String notificationId;
    String userId;
    NotificationType type;
    String title;
    String content;
    
    String referenceId;
    String referenceType;
    String actionUrl;
    
    Boolean isRead;
    LocalDateTime readAt;
    LocalDateTime createdAt;
}

