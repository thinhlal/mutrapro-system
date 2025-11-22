package com.mutrapro.project_service.enums;

public enum InstallmentStatus {
    PENDING,    // Chờ thanh toán (chưa đến hạn)
    DUE,        // Đến hạn thanh toán
    PAID,       // Đã thanh toán
    OVERDUE,    // Quá hạn thanh toán
    CANCELLED   // Đã hủy
}

