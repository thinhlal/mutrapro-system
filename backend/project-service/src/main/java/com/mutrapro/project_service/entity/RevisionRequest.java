package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.RevisionRequestStatus;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

/**
 * Entity lưu thông tin revision request từ customer
 */
@Entity
@Table(name = "revision_requests", indexes = {
    @Index(name = "idx_revision_requests_contract_id", columnList = "contract_id"),
    @Index(name = "idx_revision_requests_milestone_id", columnList = "milestone_id"),
    @Index(name = "idx_revision_requests_task_assignment_id", columnList = "task_assignment_id"),
    @Index(name = "idx_revision_requests_original_submission_id", columnList = "original_submission_id"),
    @Index(name = "idx_revision_requests_revised_submission_id", columnList = "revised_submission_id"),
    @Index(name = "idx_revision_requests_customer_id", columnList = "customer_id"),
    @Index(name = "idx_revision_requests_manager_id", columnList = "manager_id"),
    @Index(name = "idx_revision_requests_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_revision_requests_status", columnList = "status"),
    @Index(name = "idx_revision_requests_revision_round", columnList = "task_assignment_id, revision_round")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevisionRequest extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "revision_request_id", nullable = false)
    String revisionRequestId;

    // Nhóm A - ID & quan hệ
    @Column(name = "contract_id", nullable = false)
    String contractId;

    @Column(name = "milestone_id")
    String milestoneId;

    @Column(name = "task_assignment_id")
    String taskAssignmentId;

    @Column(name = "original_submission_id")
    String originalSubmissionId;  // Submission ban đầu mà customer request revision

    @Column(name = "revised_submission_id")
    String revisedSubmissionId;  // Submission mới sau khi specialist làm lại (update khi specialist submit)

    @Column(name = "customer_id", nullable = false)
    String customerId;

    @Column(name = "manager_id")
    String managerId;

    @Column(name = "specialist_id")
    String specialistId;  // Set khi approve hoặc lấy từ task

    // Nhóm B - Nội dung business
    @Column(name = "title", nullable = false, length = 255)
    String title;  // Tiêu đề ngắn yêu cầu revision

    @Column(name = "description", columnDefinition = "text", nullable = false)
    String description;  // Mô tả chi tiết yêu cầu của customer

    @Column(name = "manager_note", columnDefinition = "text")
    String managerNote;  // Ghi chú khi Manager approve / reject

    @Column(name = "specialist_note", columnDefinition = "text")
    String specialistNote;  // Ghi chú từ Specialist (optional)

    @Column(name = "revision_round", nullable = false)
    Integer revisionRound;  // Lần revision thứ mấy cho task/milestone này (1,2,3...)

    @Column(name = "is_free_revision", nullable = false)
    @Builder.Default
    Boolean isFreeRevision = true;  // Nếu vẫn muốn count số lượt revision free (true/false)

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    RevisionRequestStatus status = RevisionRequestStatus.PENDING_MANAGER_REVIEW;

    // Nhóm D - Thời gian & audit
    @Column(name = "requested_at", nullable = false)
    Instant requestedAt;  // Lúc customer gửi

    @Column(name = "manager_reviewed_at")
    Instant managerReviewedAt;  // Lúc Manager approve/reject

    @Column(name = "revision_due_at")
    Instant revisionDueAt;  // Deadline phải giao xong revision cho request này (managerReviewedAt + revisionDeadlineDays)

    @Column(name = "assigned_to_specialist_at")
    Instant assignedToSpecialistAt;  // Lúc giao cho Specialist

    @Column(name = "specialist_submitted_at")
    Instant specialistSubmittedAt;  // Lúc Specialist hoàn thành bản revised

    @Column(name = "customer_confirmed_at")
    Instant customerConfirmedAt;  // Lúc customer confirm xong

    @Column(name = "canceled_at")
    Instant canceledAt;  // Lúc bị hủy (nếu có)
}

