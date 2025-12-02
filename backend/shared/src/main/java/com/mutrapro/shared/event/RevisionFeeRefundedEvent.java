package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Event khi refund revision fee cho customer (khi manager reject paid revision request).
 * Billing-service lắng nghe để thực hiện refund vào wallet.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevisionFeeRefundedEvent implements Serializable {

    UUID eventId;
    String revisionRequestId;
    String contractId;
    String contractNumber;
    String milestoneId;
    String milestoneName;
    String taskAssignmentId;
    
    String customerUserId;  // Customer cần được refund
    String paidWalletTxId;  // ID của wallet transaction cần refund
    
    BigDecimal refundAmount;  // Số tiền refund
    String currency;  // VND, USD, etc.
    
    String refundReason;  // Lý do refund (manager note)
    String managerUserId;
    
    Instant refundedAt;
    Instant timestamp;
}

