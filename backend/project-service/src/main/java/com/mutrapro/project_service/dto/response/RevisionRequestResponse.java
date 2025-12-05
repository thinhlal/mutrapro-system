package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class RevisionRequestResponse {
    String revisionRequestId;
    String contractId;
    String milestoneId;
    String taskAssignmentId;
    String originalSubmissionId;  // Submission ban đầu mà customer request revision
    String revisedSubmissionId;  // Submission mới sau khi specialist làm lại
    String customerId;
    String managerId;
    String specialistId;
    
    String title;
    String description;
    String managerNote;
    String specialistNote;
    Integer revisionRound;
    Boolean isFreeRevision;
    String status;
    
    LocalDateTime requestedAt;
    LocalDateTime managerReviewedAt;
    LocalDateTime revisionDueAt;  // Deadline phải giao xong revision cho request này
    Integer revisionDeadlineDays;  // Số ngày SLA để hoàn thành revision (từ khi manager approve)
    LocalDateTime assignedToSpecialistAt;
    LocalDateTime specialistSubmittedAt;
    LocalDateTime customerConfirmedAt;
    LocalDateTime canceledAt;
    
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String createdBy;
    String updatedBy;
}

