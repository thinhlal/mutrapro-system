package com.mutrapro.billing_service.enums;

public enum PaymentOrderStatus {
    PENDING,    // Đang chờ thanh toán
    PROCESSING, // Đang xử lý
    COMPLETED,  // Đã thanh toán thành công
    FAILED,     // Thanh toán thất bại
    CANCELLED,  // Đã hủy
    EXPIRED     // Đã hết hạn
}

