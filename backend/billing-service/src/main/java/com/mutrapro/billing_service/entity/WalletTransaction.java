package com.mutrapro.billing_service.entity;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.WalletTxType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "wallet_transactions", indexes = {
    @Index(name = "idx_wallet_tx_wallet_id", columnList = "wallet_id"),
    @Index(name = "idx_wallet_tx_type", columnList = "tx_type"),
    @Index(name = "idx_wallet_tx_currency", columnList = "currency"),
    @Index(name = "idx_wallet_tx_contract_id", columnList = "contract_id"),
    @Index(name = "idx_wallet_tx_milestone_id", columnList = "milestone_id"),
    @Index(name = "idx_wallet_tx_submission_id", columnList = "submission_id"),
    @Index(name = "idx_wallet_tx_booking_id", columnList = "booking_id"),
    @Index(name = "idx_wallet_tx_refund_of", columnList = "refund_of_wallet_tx_id"),
    @Index(name = "idx_wallet_tx_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "wallet_tx_id", nullable = false)
    String walletTxId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    Wallet wallet;

    @Enumerated(EnumType.STRING)
    @Column(name = "tx_type", nullable = false, length = 50)
    WalletTxType txType;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    BigDecimal amount;                                                                                                                                                                                                                                                                                                                                                              

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 10)
    CurrencyType currency = CurrencyType.VND;

    @Column(name = "balance_before", nullable = false, precision = 14, scale = 2)
    BigDecimal balanceBefore;

    @Column(name = "balance_after", nullable = false, precision = 14, scale = 2)
    BigDecimal balanceAfter;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    Map<String, Object> metadata;

    // Soft references to other services for audit trail
    @Column(name = "contract_id")
    String contractId;  // Soft reference to project-service

    @Column(name = "milestone_id")
    String milestoneId;  // Soft reference to project-service - contract_milestones

    @Column(name = "submission_id")
    String submissionId;  // Soft reference to project-service - file_submissions (optional, for revision fee tracking)

    @Column(name = "booking_id")
    String bookingId;  // Soft reference to project-service

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_of_wallet_tx_id")
    WalletTransaction refundOfWalletTx;  // Reference to original transaction if this is a refund

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt = LocalDateTime.now();
}

