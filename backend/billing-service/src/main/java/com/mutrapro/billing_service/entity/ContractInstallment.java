package com.mutrapro.billing_service.entity;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.GateCondition;
import com.mutrapro.billing_service.enums.InstallmentStatus;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "contract_installments", indexes = {
    @Index(name = "idx_installments_contract_id", columnList = "contract_id"),
    @Index(name = "idx_installments_status", columnList = "status"),
    @Index(name = "idx_installments_is_deposit", columnList = "is_deposit"),
    @Index(name = "idx_installments_due_date", columnList = "due_date")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContractInstallment extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "installment_id", nullable = false)
    String installmentId;

    @Column(name = "contract_id", nullable = false)
    String contractId;  // Soft reference to project-service

    @Column(name = "label", nullable = false, length = 50)
    String label;  // Deposit, Phase 1, Phase 2, Final

    @Column(name = "due_date")
    Instant dueDate;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    BigDecimal amount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 10)
    CurrencyType currency = CurrencyType.VND;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    InstallmentStatus status = InstallmentStatus.pending;

    @Builder.Default
    @Column(name = "is_deposit", nullable = false)
    Boolean isDeposit = false;

    @Column(name = "milestone_id")
    String milestoneId;  // Soft reference to project-service - contract_milestones

    @Enumerated(EnumType.STRING)
    @Column(name = "gate_condition", length = 20)
    GateCondition gateCondition;

    @Builder.Default
    @Column(name = "applied_credit_amount", precision = 12, scale = 2)
    BigDecimal appliedCreditAmount = BigDecimal.ZERO;

    @Column(name = "paid_at")
    Instant paidAt;
}

