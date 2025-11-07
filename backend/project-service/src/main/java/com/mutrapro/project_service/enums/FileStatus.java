package com.mutrapro.project_service.enums;

public enum FileStatus {
    uploaded,           // File đã upload
    pending_review,     // Chờ review
    approved,           // Đã duyệt
    rejected,           // Bị từ chối
    delivered,          // Đã giao cho customer
    revision_requested  // Yêu cầu chỉnh sửa
}

