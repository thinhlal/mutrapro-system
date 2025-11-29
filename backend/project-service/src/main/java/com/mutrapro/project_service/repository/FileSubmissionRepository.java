package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.FileSubmission;
import com.mutrapro.project_service.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FileSubmissionRepository extends JpaRepository<FileSubmission, String> {

    // Find submissions by assignment ID
    List<FileSubmission> findByAssignmentId(String assignmentId);

    // Find submissions by assignment ID and status
    List<FileSubmission> findByAssignmentIdAndStatus(String assignmentId, SubmissionStatus status);

    // Find active submission (draft or pending_review) for assignment
    Optional<FileSubmission> findByAssignmentIdAndStatusIn(String assignmentId, List<SubmissionStatus> statuses);

    // Find submissions by creator
    List<FileSubmission> findByCreatedBy(String createdBy);

    // Find latest submission by assignment ID (order by version desc or createdAt desc)
    Optional<FileSubmission> findFirstByAssignmentIdOrderByCreatedAtDesc(String assignmentId);

    // Batch fetch submissions by multiple assignmentIds
    List<FileSubmission> findByAssignmentIdIn(List<String> assignmentIds);
}

