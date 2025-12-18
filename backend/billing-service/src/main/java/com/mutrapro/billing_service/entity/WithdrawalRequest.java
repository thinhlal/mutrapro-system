package com.mutrapro.billing_service.entity;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.WithdrawalStatus;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "withdrawal_requests", indexes = {
    @Index(name = "idx_withdrawal_requests_wallet_id", columnList = "wallet_id"),
    @Index(name = "idx_withdrawal_requests_status", columnList = "status"),
    @Index(name = "idx_withdrawal_requests_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WithdrawalRequest extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "withdrawal_request_id", nullable = false)
    String withdrawalRequestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    Wallet wallet;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    BigDecimal amount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 10)
    CurrencyType currency = CurrencyType.VND;

    @Column(name = "bank_account_number", nullable = false, length = 50)
    String bankAccountNumber;

    @Column(name = "bank_name", nullable = false, length = 100)
    String bankName;

    @Column(name = "account_holder_name", nullable = false, length = 255)
    String accountHolderName;

    @Column(name = "note", columnDefinition = "text")
    String note;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    WithdrawalStatus status = WithdrawalStatus.PENDING_REVIEW;

    @Column(name = "approved_by")
    String approvedBy;  // User ID của admin/manager đã duyệt

    @Column(name = "approved_at")
    LocalDateTime approvedAt;

    @Column(name = "rejected_by")
    String rejectedBy;  // User ID của admin/manager đã từ chối

    @Column(name = "rejected_at")
    LocalDateTime rejectedAt;

    @Column(name = "rejection_reason", columnDefinition = "text")
    String rejectionReason;  // Lý do từ chối

    @Column(name = "admin_note", columnDefinition = "text")
    String adminNote;  // Ghi chú của admin khi duyệt/từ chối

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_tx_id", unique = true)
    WalletTransaction walletTransaction;  // Transaction được tạo khi complete

    // Thông tin chuyển tiền (khi staff chuyển tiền thủ công)
    @Column(name = "paid_at")
    LocalDateTime paidAt;  // Thời gian chuyển tiền

    @Column(name = "paid_amount", precision = 14, scale = 2)
    BigDecimal paidAmount;  // Số tiền thực tế đã chuyển (có thể khác amount nếu có phí)

    @Column(name = "provider", length = 100)
    String provider;  // Nhà cung cấp dịch vụ chuyển tiền (ví dụ: Vietcombank, Techcombank, etc.)

    @Column(name = "bank_ref", length = 100)
    String bankRef;  // Mã tham chiếu từ ngân hàng

    @Column(name = "txn_code", length = 100)
    String txnCode;  // Mã giao dịch từ provider

    @Column(name = "proof_url", length = 500)
    String proofUrl;  // URL ảnh/biên lai chuyển tiền

    @Column(name = "completed_by")
    String completedBy;  // User ID của staff đã hoàn thành chuyển tiền

    @Column(name = "completed_at")
    LocalDateTime completedAt;

    @Column(name = "failed_by")
    String failedBy;  // User ID của staff đánh dấu failed

    @Column(name = "failed_at")
    LocalDateTime failedAt;

    @Column(name = "failure_reason", columnDefinition = "text")
    String failureReason;  // Lý do failed

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();
}

