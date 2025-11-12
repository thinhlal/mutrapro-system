package com.mutrapro.project_service.enums;

public enum ContractStatus {
    draft,
    sent,
    approved,              // Khách đã approve contract
    rejected_by_customer,  // Khách từ chối contract
    need_revision,         // Khách yêu cầu chỉnh sửa
    canceled_by_customer,  // Khách hủy contract
    canceled_by_manager,   // Manager hủy contract
    signed,                // Đã ký (legacy, có thể dùng thay cho approved)
    expired
}

