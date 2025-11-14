package com.mutrapro.billing_service.enums;

public enum GateCondition {
    before_start,   // Trả trước khi bắt đầu mốc (dùng cho Deposit)
    after_accept,   // Trả sau khi mốc được duyệt
    after_delivery  // Trả sau khi có file bàn giao (delivered)
}

