package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.RevisionRequest;
import com.mutrapro.project_service.enums.RevisionRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RevisionRequestRepository extends JpaRepository<RevisionRequest, String> {

    // Find all revision requests by contract ID
    List<RevisionRequest> findByContractId(String contractId);

    // Find all revision requests by milestone ID
    List<RevisionRequest> findByMilestoneId(String milestoneId);

    // Find all revision requests by task assignment ID
    List<RevisionRequest> findByTaskAssignmentId(String taskAssignmentId);
    
    // Batch find revision requests by multiple task assignment IDs (for performance optimization)
    List<RevisionRequest> findByTaskAssignmentIdIn(List<String> taskAssignmentIds);

    // Find all revision requests by customer ID
    List<RevisionRequest> findByCustomerId(String customerId);

    // Find all revision requests by manager ID
    List<RevisionRequest> findByManagerId(String managerId);

    // Find all revision requests by specialist ID
    List<RevisionRequest> findBySpecialistId(String specialistId);

    // Find all revision requests by status
    List<RevisionRequest> findByStatus(RevisionRequestStatus status);

    // Find revision requests by contract ID and status
    List<RevisionRequest> findByContractIdAndStatus(String contractId, RevisionRequestStatus status);

    // Find revision requests by task assignment ID and status
    List<RevisionRequest> findByTaskAssignmentIdAndStatus(String taskAssignmentId, RevisionRequestStatus status);

    // Find the next revision round number for a task assignment
    @Query("SELECT COALESCE(MAX(r.revisionRound), 0) + 1 FROM RevisionRequest r WHERE r.taskAssignmentId = :taskAssignmentId")
    Integer findNextRevisionRound(@Param("taskAssignmentId") String taskAssignmentId);

    // Find revision request by task assignment ID and revision round
    Optional<RevisionRequest> findByTaskAssignmentIdAndRevisionRound(String taskAssignmentId, Integer revisionRound);

    // Count completed revisions for a task assignment
    long countByTaskAssignmentIdAndStatus(String taskAssignmentId, RevisionRequestStatus status);

    // Count completed revisions for a contract
    long countByContractIdAndStatus(String contractId, RevisionRequestStatus status);
}

