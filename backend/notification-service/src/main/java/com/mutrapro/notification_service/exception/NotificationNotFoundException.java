package com.mutrapro.notification_service.exception;

import com.mutrapro.notification_service.enums.NotificationErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy notification
 */
public class NotificationNotFoundException extends ResourceNotFoundException {
    
    private NotificationNotFoundException(String message) {
        super(NotificationErrorCodes.NOTIFICATION_NOT_FOUND, message);
    }
    
    private NotificationNotFoundException(String message, Map<String, Object> details) {
        super(NotificationErrorCodes.NOTIFICATION_NOT_FOUND, message, details);
    }
    
    /**
     * Tạo exception khi notification không tồn tại
     */
    public static NotificationNotFoundException byId(String notificationId) {
        return new NotificationNotFoundException(
            "Notification not found",
            Map.of("notificationId", notificationId)
        );
    }
    
    /**
     * Tạo exception khi notification không thuộc về user
     */
    public static NotificationNotFoundException byIdAndUserId(String notificationId, String userId) {
        return new NotificationNotFoundException(
            "Notification not found for user",
            Map.of("notificationId", notificationId, "userId", userId)
        );
    }
}

