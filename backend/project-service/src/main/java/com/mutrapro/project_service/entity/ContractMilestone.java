package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "contract_milestones", indexes = {
    @Index(name = "idx_milestones_contract_id", columnList = "contract_id"),
    @Index(name = "idx_milestones_order_index", columnList = "contract_id, order_index"),
    @Index(name = "idx_milestones_work_status", columnList = "work_status"),
    @Index(name = "idx_milestones_milestone_type", columnList = "milestone_type")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContractMilestone extends BaseEntity<String> {

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

    // Milestone type: để phân biệt milestone là Arrangement hay Recording (cho arrangement_with_recording)
    @Enumerated(EnumType.STRING)
    @Column(name = "milestone_type", length = 20)
    MilestoneType milestoneType;  // transcription, arrangement, recording - NULL nếu không áp dụng

    // Phần WORK
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "work_status", nullable = false, length = 50)
    MilestoneWorkStatus workStatus = MilestoneWorkStatus.PLANNED;

    // Payment flag: milestone này có installment tương ứng không
    @Builder.Default
    @Column(name = "has_payment", nullable = false)
    Boolean hasPayment = false;

    // SLA và planned dates
    @Column(name = "milestone_sla_days")
    Integer milestoneSlaDays;  // SLA ngày cho milestone này (FE gửi, BE lưu)

    @Column(name = "planned_start_at")
    LocalDateTime plannedStartAt;  // BE tính khi contract có start date

    @Column(name = "planned_due_date")
    LocalDateTime plannedDueDate;  // BE tính khi contract có start date (plannedStartAt + milestoneSlaDays)

    @Column(name = "actual_start_at")
    LocalDateTime actualStartAt;  // Ghi nhận thời điểm milestone thực tế bắt đầu

    @Column(name = "actual_end_at")
    LocalDateTime actualEndAt;  // Ghi nhận thời điểm milestone thực tế kết thúc

    @Column(name = "first_submission_at")
    LocalDateTime firstSubmissionAt;  // Lúc specialist giao bản đầu tiên (để check SLA milestone - KHÔNG thay đổi khi có revision)

    @Column(name = "final_completed_at")
    LocalDateTime finalCompletedAt;  // Lúc customer chấp nhận bản cuối cùng (sau mọi revision)
}

