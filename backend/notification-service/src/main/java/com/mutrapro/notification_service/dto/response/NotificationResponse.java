package com.mutrapro.notification_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.mutrapro.shared.enums.NotificationType;

/**
 * Response DTO for Notification
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

