package com.mutrapro.project_service.enums;

/**
 * Trạng thái của revision request
 */
public enum RevisionRequestStatus {
    PENDING_MANAGER_REVIEW,   // Customer gửi, chờ Manager
    IN_REVISION,              // Manager approve, Specialist đang làm
    WAITING_MANAGER_REVIEW,   // Specialist đã submit, chờ Manager review
    APPROVED_PENDING_DELIVERY, // Manager đã approve submission, chờ deliver
    WAITING_CUSTOMER_CONFIRM, // Manager đã deliver, chờ Customer confirm
    COMPLETED,                // Customer OK
    REJECTED,                 // Manager từ chối
    CANCELED                  // Customer/Manager hủy
}

