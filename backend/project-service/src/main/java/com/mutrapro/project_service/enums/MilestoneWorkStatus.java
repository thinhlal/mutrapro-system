package com.mutrapro.project_service.enums;

public enum MilestoneWorkStatus {
    PLANNED,           // Đã tạo mốc, chưa bắt đầu
    IN_PROGRESS,       // Đang thực hiện công việc
    WAITING_CUSTOMER,  // Đang chờ khách hàng phản hồi/duyệt
    READY_FOR_PAYMENT, // Đã hoàn thành công việc, sẵn sàng để thanh toán
    COMPLETED,         // Đã hoàn thành (cả công việc và thanh toán)
    CANCELLED          // Đã hủy
}

