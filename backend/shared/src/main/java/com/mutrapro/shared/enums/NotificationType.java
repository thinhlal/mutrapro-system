package com.mutrapro.shared.enums;

/**
 * Các loại notification trong hệ thống
 */
public enum NotificationType {
    CHAT_ROOM_CREATED,          // Phòng chat mới được tạo
    NEW_MESSAGE,                // Tin nhắn mới
    REQUEST_ASSIGNED,           // Request được assign
    REQUEST_UPDATED,            // Request được cập nhật
    PROJECT_CREATED,            // Project mới
    PROJECT_UPDATED,            // Project cập nhật
    CONTRACT_SENT,              // Contract được gửi cho customer
    CONTRACT_APPROVED,          // Contract được approve
    CONTRACT_NEED_REVISION,     // Contract yêu cầu chỉnh sửa
    CONTRACT_CANCELED_BY_CUSTOMER,  // Contract bị customer hủy
    CONTRACT_CANCELED_BY_MANAGER,   // Contract bị manager hủy
    MILESTONE_PAID,             // Milestone đã được thanh toán
    ALL_MILESTONES_PAID,        // Tất cả milestones đã được thanh toán
    SYSTEM_ANNOUNCEMENT         // Thông báo hệ thống
}

