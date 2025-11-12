package com.mutrapro.request_service.enums;

public enum RequestStatus {
    pending,
    contract_sent,
    contract_approved,     // Customer đã duyệt contract, chờ ký
    contract_signed,
    in_progress,
    completed,
    cancelled,
    rejected
}

