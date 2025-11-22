package com.mutrapro.project_service.enums;

public enum GateCondition {
    BEFORE_START,          // Dùng cho DEPOSIT: contract accepted là mở DUE
    AFTER_MILESTONE_DONE,  // milestone COMPLETED
    AFTER_MILESTONE_APPROVED, // milestone APPROVED_BY_CUSTOMER
    MANUAL                 // admin/manager tự mở
}

