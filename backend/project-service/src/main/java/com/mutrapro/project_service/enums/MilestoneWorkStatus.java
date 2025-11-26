package com.mutrapro.project_service.enums;

public enum MilestoneWorkStatus {
    PLANNED,           // Đã tạo mốc, chưa được phép bắt đầu
    READY_TO_START,    // Được phép bắt đầu (contract active & unlocked) nhưng chưa có hành động thực tế
    IN_PROGRESS,       // Đang thực hiện công việc (đã assign & specialist/manager bắt đầu)
    WAITING_CUSTOMER,  // Đang chờ khách hàng phản hồi/duyệt
    READY_FOR_PAYMENT, // Đã hoàn thành công việc, sẵn sàng để thanh toán
    COMPLETED,         // Đã hoàn thành (cả công việc và thanh toán)
    CANCELLED          // Đã hủy
}

