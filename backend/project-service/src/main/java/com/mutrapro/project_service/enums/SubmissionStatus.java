package com.mutrapro.project_service.enums;

public enum SubmissionStatus {
    draft,                      // Đang soạn thảo, chưa submit
    pending_review,             // Đã submit, chờ manager review
    approved,                   // Đã được duyệt
    rejected,                   // Bị từ chối
    revision_requested,         // Yêu cầu chỉnh sửa (từ manager hoặc đã được manager approve)
    delivered                   // Đã được gửi cho customer
}

