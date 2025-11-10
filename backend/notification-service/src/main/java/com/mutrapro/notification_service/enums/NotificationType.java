package com.mutrapro.notification_service.enums;

/**
 * Các loại notification trong hệ thống
 */
public enum NotificationType {
    CHAT_ROOM_CREATED,      // Phòng chat mới được tạo
    NEW_MESSAGE,            // Tin nhắn mới
    REQUEST_ASSIGNED,       // Request được assign
    REQUEST_UPDATED,        // Request được cập nhật
    PROJECT_CREATED,        // Project mới
    PROJECT_UPDATED,        // Project cập nhật
    SYSTEM_ANNOUNCEMENT     // Thông báo hệ thống
}

