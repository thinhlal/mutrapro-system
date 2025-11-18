package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Entity
@Table(name = "task_assignments", indexes = {
    @Index(name = "idx_task_assignments_contract_id", columnList = "contract_id"),
    @Index(name = "idx_task_assignments_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_task_assignments_milestone_id", columnList = "milestone_id"),
    @Index(name = "idx_task_assignments_status", columnList = "status"),
    @Index(name = "idx_task_assignments_task_type", columnList = "task_type"),
    @Index(name = "idx_task_assignments_specialist_can_do", columnList = "specialist_can_do")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TaskAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "assignment_id", nullable = false)
    String assignmentId;

    @Column(name = "contract_id", nullable = false)
    String contractId;  // Foreign key to contracts.contract_id

    @Column(name = "specialist_id", nullable = false)
    String specialistId;  // Soft reference to specialist-service

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 20)
    TaskType taskType;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    AssignmentStatus status = AssignmentStatus.assigned;

    @Column(name = "milestone_id", nullable = false)
    String milestoneId;  // Soft reference to contract_milestones.milestone_id

    @Builder.Default
    @Column(name = "assigned_date", nullable = false)
    Instant assignedDate = Instant.now();

    @Column(name = "completed_date")
    Instant completedDate;

    @Column(name = "notes", columnDefinition = "text")
    String notes;

    @Column(name = "specialist_response_reason", columnDefinition = "text")
    String specialistResponseReason;

    @Column(name = "specialist_responded_at")
    Instant specialistRespondedAt;

    // Reassign request fields (khi specialist request reassign từ in_progress)
    @Column(name = "reassign_reason", columnDefinition = "text")
    String reassignReason;  // Lý do request reassign

    @Column(name = "reassign_requested_at")
    Instant reassignRequestedAt;  // Thời gian specialist request

    @Column(name = "reassign_requested_by")
    String reassignRequestedBy;  // Specialist ID

    @Column(name = "reassign_approved_by")
    String reassignApprovedBy;  // Manager user ID

    @Column(name = "reassign_approved_at")
    Instant reassignApprovedAt;  // Thời gian manager approve/reject

    @Column(name = "reassign_decision", length = 20)
    String reassignDecision;  // "APPROVED" hoặc "REJECTED"

    @Column(name = "reassign_decision_reason", columnDefinition = "text")
    String reassignDecisionReason;  // Lý do manager approve/reject

    // Revision tracking (chỉ cho transcription và arrangement)
    @Builder.Default
    @Column(name = "used_revisions", nullable = false)
    Integer usedRevisions = 0;  // Số lần revision đã sử dụng cho task này
}

