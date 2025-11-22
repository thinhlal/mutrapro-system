package com.mutrapro.project_service.enums;

public enum InstallmentType {
    DEPOSIT,           // Cọc (bắt buộc, milestone_id = NULL)
    INTERMEDIATE,      // Thanh toán trung gian (gắn với milestone)
    FINAL,             // Thanh toán cuối (gắn với milestone)
    EXTRA_REVISION     // Phí revision thêm (gắn với milestone revision, không tính vào 100%)
}

