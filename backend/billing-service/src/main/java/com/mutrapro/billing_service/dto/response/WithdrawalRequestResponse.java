package com.mutrapro.billing_service.dto.response;

import com.mutrapro.billing_service.enums.CurrencyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class WithdrawalRequestResponse {
    String withdrawalRequestId;
    String walletId;
    String userId;
    BigDecimal amount;
    CurrencyType currency;
    String bankAccountNumber;
    String bankName;
    String accountHolderName;
    String note;
    String status;  // PENDING_REVIEW, APPROVED, PROCESSING, COMPLETED, REJECTED, FAILED
    String approvedBy;
    LocalDateTime approvedAt;
    String rejectedBy;
    LocalDateTime rejectedAt;
    String rejectionReason;
    String adminNote;
    LocalDateTime paidAt;
    BigDecimal paidAmount;
    String provider;
    String bankRef;
    String txnCode;
    String proofUrl;
    String completedBy;
    LocalDateTime completedAt;
    String failedBy;
    LocalDateTime failedAt;
    String failureReason;
    String walletTxId;  // Transaction ID khi đã complete
    LocalDateTime createdAt;
}

