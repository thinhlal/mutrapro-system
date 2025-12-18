package com.mutrapro.billing_service.enums;

public enum WithdrawalStatus {
    PENDING_REVIEW,  // Customer tạo yêu cầu, tiền đã được hold, chờ manager duyệt
    APPROVED,        // Manager đã duyệt, chờ staff chuyển tiền
    PROCESSING,      // Staff đang chuyển tiền (optional, có thể dùng APPROVED thay thế)
    COMPLETED,       // Đã chuyển tiền thành công
    REJECTED,        // Manager từ chối, tiền đã được release về available
    FAILED           // Chuyển tiền thất bại/nhầm, tiền đã được release về available
}

