package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "task_assignments", indexes = {
    @Index(name = "idx_task_assignments_contract_id", columnList = "contract_id"),
    @Index(name = "idx_task_assignments_specialist_id", columnList = "specialist_id"),
    @Index(name = "idx_task_assignments_milestone_id", columnList = "milestone_id"),
    @Index(name = "idx_task_assignments_milestone_contract", columnList = "milestone_id, contract_id"),
    @Index(name = "idx_task_assignments_status", columnList = "status"),
    @Index(name = "idx_task_assignments_task_type", columnList = "task_type"),
    // Composite index để tối ưu query filter và sort (contract_id, status, task_type, has_issue, assigned_date)
    @Index(name = "idx_task_assignments_contract_status_type", columnList = "contract_id, status, task_type"),
    @Index(name = "idx_task_assignments_sort", columnList = "has_issue, status, assigned_date")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TaskAssignment extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "assignment_id", nullable = false)
    String assignmentId;

    @Column(name = "contract_id", nullable = false)
    String contractId;  // Foreign key to contracts.contract_id
    
    // Contract snapshots - để tránh fetch Contract trong list view
    @Column(name = "contract_number_snapshot", length = 100)
    String contractNumberSnapshot;
    
    @Column(name = "contract_name_snapshot", length = 500)
    String contractNameSnapshot;
    
    @Column(name = "contract_created_at_snapshot")
    LocalDateTime contractCreatedAtSnapshot;

    @Column(name = "specialist_id", nullable = false)
    String specialistId;  // Soft reference to specialist-service

    @Column(name = "specialist_name_snapshot", length = 255)
    String specialistNameSnapshot;
    
    @Column(name = "specialist_email_snapshot", length = 255)
    String specialistEmailSnapshot;
    
    @Column(name = "specialist_specialization_snapshot", length = 100)
    String specialistSpecializationSnapshot;
    
    @Column(name = "specialist_experience_years_snapshot")
    Integer specialistExperienceYearsSnapshot;
    
    @Column(name = "specialist_user_id_snapshot", length = 50)
    String specialistUserIdSnapshot;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 30)
    TaskType taskType;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    AssignmentStatus status = AssignmentStatus.assigned;

    @Column(name = "milestone_id", nullable = false)
    String milestoneId;  // Soft reference to contract_milestones.milestone_id

    @Builder.Default
    @Column(name = "assigned_date", nullable = false)
    LocalDateTime assignedDate = LocalDateTime.now();

    @Column(name = "completed_date")
    LocalDateTime completedDate;

    @Column(name = "notes", columnDefinition = "text")
    String notes;

    @Column(name = "specialist_response_reason", columnDefinition = "text")
    String specialistResponseReason;

    @Column(name = "specialist_responded_at")
    LocalDateTime specialistRespondedAt;

    // Issue reporting (khi specialist báo không kịp deadline)
    @Builder.Default
    @Column(name = "has_issue", nullable = false)
    Boolean hasIssue = false;  // Flag đánh dấu task có vấn đề/risk

    @Column(name = "issue_reason", columnDefinition = "text")
    String issueReason;  // Lý do báo issue (ví dụ: không kịp deadline)

    @Column(name = "issue_reported_at")
    LocalDateTime issueReportedAt;  // Thời gian specialist báo issue

    // Link to studio booking (cho recording tasks)
    @Column(name = "studio_booking_id")
    String studioBookingId; // Soft reference to studio_bookings.booking_id (nullable - có thể null lúc mới tạo task)
    
    // Progress percentage - tính ở backend và update khi submission thay đổi (0-100)
    @Column(name = "progress_percentage")
    Integer progressPercentage;
}

