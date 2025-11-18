package com.mutrapro.project_service.enums;

public enum AssignmentStatus {
    assigned,              // Đã gán task
    in_progress,           // Đang thực hiện
    completed,             // Đã hoàn thành
    cancelled,             // Đã hủy (chỉ khi assigned)
    reassign_requested     // Specialist đã request reassign (từ in_progress)
}

