package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.SubmissionStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Entity
@Table(name = "file_submissions", indexes = {
    @Index(name = "idx_file_submissions_assignment_id", columnList = "assignment_id"),
    @Index(name = "idx_file_submissions_revision_request_id", columnList = "revision_request_id"),
    @Index(name = "idx_file_submissions_created_by", columnList = "created_by"),
    @Index(name = "idx_file_submissions_status", columnList = "status"),
    @Index(name = "idx_file_submissions_submitted_at", columnList = "submitted_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FileSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "submission_id", nullable = false)
    String submissionId;

    @Column(name = "assignment_id", nullable = false)
    String assignmentId;  // Reference to task_assignments

    @Column(name = "revision_request_id")
    String revisionRequestId;  // Reference to revision_requests (nếu submission này là revised submission)

    @Column(name = "submission_name", length = 255)
    String submissionName;  // Tự động tạo: "Submission v{version}" - để phân biệt các version

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    SubmissionStatus status = SubmissionStatus.draft;

    @Column(name = "created_by", nullable = false)
    String createdBy;  // Soft reference to identity-service (specialist)

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    Instant createdAt = Instant.now();

    @Column(name = "submitted_at")
    Instant submittedAt;  // Khi nào specialist submit for review

    @Column(name = "reviewed_by")
    String reviewedBy;  // Soft reference to identity-service (manager)

    @Column(name = "reviewed_at")
    Instant reviewedAt;  // Khi nào manager review

    @Column(name = "rejection_reason", columnDefinition = "text")
    String rejectionReason;  // Lý do reject (nếu có)

    @Column(name = "version")
    Integer version;  // Version của submission (có thể có nhiều submissions cho cùng assignment)
}

