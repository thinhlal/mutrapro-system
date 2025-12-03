package com.mutrapro.project_service.enums;

public enum ContractStatus {
    draft,
    sent,
    approved,              // Khách đã approve contract
    rejected_by_customer,  // Khách từ chối contract
    need_revision,         // Khách yêu cầu chỉnh sửa
    canceled_by_customer,  // Khách hủy contract
    canceled_by_manager,   // Manager hủy contract
    signed,                // Đã ký nhưng chưa thanh toán deposit
    active_pending_assignment, // Đã thanh toán deposit, chờ manager assign/start
    active,                // Đang thực thi (đã start work)
    completed,             // Đã hoàn thành (tất cả milestones đã được thanh toán)
    expired
}

