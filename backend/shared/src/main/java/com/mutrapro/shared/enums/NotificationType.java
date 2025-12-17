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
    MILESTONE_READY_FOR_PAYMENT, // Milestone sẵn sàng thanh toán (customer đã accept submission)
    ALL_MILESTONES_PAID,        // Tất cả milestones đã được thanh toán
    TASK_ASSIGNMENT_ASSIGNED,   // Specialist được giao task mới
    TASK_ASSIGNMENT_READY_TO_START, // Task assignment đã sẵn sàng để specialist bắt đầu làm (milestone đã unlock)
    TASK_ASSIGNMENT_CANCELED,   // Task assignment bị specialist hoặc manager cancel
    TASK_ISSUE_REPORTED,        // Specialist báo issue / không kịp deadline cho task
    TASK_DEADLINE_REMINDER,     // Nhắc hạn task (sắp đến deadline)
    TASK_FILE_UPLOADED,         // Specialist đã upload file output cho task
    SUBMISSION_DELIVERED,       // Submission đã được gửi cho customer
    SUBMISSION_REJECTED,        // Submission bị manager reject, specialist cần chỉnh sửa lại
    CUSTOMER_REVISION_REQUESTED, // Customer yêu cầu revision, chờ manager duyệt
    REVISION_REQUEST_APPROVED,  // Manager đã duyệt revision request, specialist bắt đầu làm
    REVISION_REQUEST_REJECTED,   // Manager từ chối yêu cầu revision
    REVISION_FEE_REFUNDED,       // Revision fee đã được refund vào wallet
    PAYMENT_ORDER_COMPLETED,     // Payment order đã được thanh toán thành công (topup)
    SYSTEM_ANNOUNCEMENT         // Thông báo hệ thống
}

