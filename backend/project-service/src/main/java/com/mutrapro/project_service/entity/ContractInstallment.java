package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.CurrencyType;
import com.mutrapro.project_service.enums.GateCondition;
import com.mutrapro.project_service.enums.InstallmentStatus;
import com.mutrapro.project_service.enums.InstallmentType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_installments", indexes = {
    @Index(name = "idx_installments_contract_id", columnList = "contract_id"),
    @Index(name = "idx_installments_status", columnList = "status"),
    @Index(name = "idx_installments_type", columnList = "type"),
    @Index(name = "idx_installments_milestone_id", columnList = "milestone_id")
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
    String contractId;  // Foreign key to contracts.contract_id

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    InstallmentType type = InstallmentType.DEPOSIT;

    @Column(name = "milestone_id", length = 36)
    String milestoneId;  // NULL cho DEPOSIT, gắn với milestone cho các type khác

    @Column(name = "label", nullable = false, length = 100)
    String label;  // "Deposit", "Milestone 1 Payment", etc.

    @Column(name = "percent", precision = 5, scale = 2)
    BigDecimal percent;  // NULL cho EXTRA_REVISION, có giá trị cho các type khác

    @Column(name = "due_date")
    LocalDateTime dueDate;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    BigDecimal amount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 10)
    CurrencyType currency = CurrencyType.VND;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    InstallmentStatus status = InstallmentStatus.PENDING;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "gate_condition", nullable = false, length = 20)
    GateCondition gateCondition = GateCondition.BEFORE_START;

    @Column(name = "paid_at")
    LocalDateTime paidAt;
}

