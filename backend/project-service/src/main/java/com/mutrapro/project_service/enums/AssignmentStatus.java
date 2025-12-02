package com.mutrapro.project_service.enums;

public enum AssignmentStatus {
    assigned,              // Đã gán task, chờ specialist phản hồi
    accepted_waiting,      // Specialist đã nhận nhưng milestone chưa tới lượt
    ready_to_start,        // Milestone đã mở, chờ specialist bấm Start
    in_progress,           // Đang thực hiện
    ready_for_review,      // Đã submit, chờ manager review
    revision_requested,    // Manager yêu cầu chỉnh sửa (từ manager)
    in_revision,           // Customer yêu cầu revision, manager đã approve, specialist đang làm
    delivery_pending,      // Đã được approve, chờ specialist deliver files
    completed,             // Đã hoàn thành (tất cả files đã được delivered)
    cancelled              // Đã hủy
}

