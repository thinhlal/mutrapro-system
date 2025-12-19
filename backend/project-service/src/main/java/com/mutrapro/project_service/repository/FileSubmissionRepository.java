package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.FileSubmission;
import com.mutrapro.project_service.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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
    
    // Batch fetch submissions by multiple assignmentIds and status (tối ưu: chỉ fetch pending_review)
    List<FileSubmission> findByAssignmentIdInAndStatus(List<String> assignmentIds, SubmissionStatus status);

    /**
     * Tìm delivered submissions theo milestoneId và contractId (cho customer)
     * Query trực tiếp từ milestone, không qua assignment
     * Lấy cả delivered, customer_accepted và customer_rejected submissions
     */
    @Query("SELECT fs FROM FileSubmission fs " +
           "JOIN TaskAssignment ta ON fs.assignmentId = ta.assignmentId " +
           "WHERE ta.milestoneId = :milestoneId " +
           "AND ta.contractId = :contractId " +
           "AND (fs.status = :status OR fs.status = 'customer_accepted' OR fs.status = 'customer_rejected') " +
           "ORDER BY fs.createdAt DESC")
    List<FileSubmission> findDeliveredSubmissionsByMilestoneAndContract(
            @Param("milestoneId") String milestoneId,
            @Param("contractId") String contractId,
            @Param("status") SubmissionStatus status);
}

