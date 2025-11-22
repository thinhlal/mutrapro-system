package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.MilestoneBillingType;
import com.mutrapro.project_service.enums.MilestonePaymentStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Table(name = "contract_milestones", indexes = {
    @Index(name = "idx_milestones_contract_id", columnList = "contract_id"),
    @Index(name = "idx_milestones_order_index", columnList = "contract_id, order_index"),
    @Index(name = "idx_milestones_work_status", columnList = "work_status"),
    @Index(name = "idx_milestones_payment_status", columnList = "payment_status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContractMilestone {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "milestone_id", nullable = false)
    String milestoneId;

    @Column(name = "contract_id", nullable = false)
    String contractId;  // Foreign key to contracts.contract_id

    @Column(name = "name", nullable = false, length = 100)
    String name;  // "Milestone 1: Deposit & Start Arrangement"

    @Column(name = "description", columnDefinition = "text")
    String description;  // Mô tả công việc trong milestone này

    @Column(name = "order_index", nullable = false)
    Integer orderIndex;  // 1, 2, 3... thứ tự milestone

    // Phần WORK
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "work_status", nullable = false, length = 20)
    MilestoneWorkStatus workStatus = MilestoneWorkStatus.PLANNED;

    // Phần COST
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_type", nullable = false, length = 20)
    MilestoneBillingType billingType = MilestoneBillingType.PERCENTAGE;

    @Column(name = "billing_value", precision = 12, scale = 2)
    BigDecimal billingValue;  
    // Nếu PERCENTAGE -> 30, 40, 30 (phần trăm)
    // Nếu FIXED -> số tiền cố định

    @Column(name = "amount", precision = 12, scale = 2)
    BigDecimal amount;  
    // Số tiền thực tế của milestone (tính từ totalPrice * billingValue / 100 nếu PERCENTAGE)
    // Hoặc = billingValue nếu FIXED

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 20)
    MilestonePaymentStatus paymentStatus = MilestonePaymentStatus.NOT_DUE;

    // SLA và planned dates
    @Column(name = "milestone_sla_days")
    Integer milestoneSlaDays;  // SLA ngày cho milestone này (FE gửi, BE lưu)

    @Column(name = "planned_start_at")
    LocalDateTime plannedStartAt;  // BE tính khi contract có start date

    @Column(name = "planned_due_date")
    LocalDateTime plannedDueDate;  // BE tính khi contract có start date (plannedStartAt + milestoneSlaDays)

    @Column(name = "paid_at")
    Instant paidAt;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt;
}

