package com.mutrapro.request_service.enums;

public enum RequestStatus {
    pending,
    contract_sent,
    contract_approved,     // Customer đã duyệt contract, chờ ký
    contract_signed,
    awaiting_assignment,   // Customer đã thanh toán deposit, chờ manager gán task/bắt đầu
    in_progress,
    completed,
    cancelled,
    rejected
}

