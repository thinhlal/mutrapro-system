package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.enums.ContractStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, String> {

    // Find all task assignments by contract ID
    List<TaskAssignment> findByContractId(String contractId);

    // Find all task assignments by milestone ID
    List<TaskAssignment> findByMilestoneId(String milestoneId);

    // Find active task assignment by milestone ID (not cancelled)
    Optional<TaskAssignment> findByMilestoneIdAndStatusNot(String milestoneId, AssignmentStatus status);

    // Find all task assignments by contract ID and milestone ID
    List<TaskAssignment> findByContractIdAndMilestoneId(String contractId, String milestoneId);

    // Find cancelled task assignments by contract ID and milestone ID
    List<TaskAssignment> findByContractIdAndMilestoneIdAndStatus(String contractId, String milestoneId, AssignmentStatus status);

    // Find distinct specialist IDs who cancelled task for milestone
    @Query("SELECT DISTINCT ta.specialistId FROM TaskAssignment ta " +
           "WHERE ta.contractId = :contractId " +
           "AND ta.milestoneId = :milestoneId " +
           "AND ta.status = :status")
    List<String> findDistinctSpecialistIdsByContractIdAndMilestoneIdAndStatus(
        @Param("contractId") String contractId,
        @Param("milestoneId") String milestoneId,
        @Param("status") AssignmentStatus status
    );

    // Find all task assignments by specialist ID
    List<TaskAssignment> findBySpecialistId(String specialistId);

    // Find all task assignments by multiple specialist IDs (batch query)
    List<TaskAssignment> findBySpecialistIdIn(List<String> specialistIds);

    // Find all task assignments by contract ID and task type
    List<TaskAssignment> findByContractIdAndTaskType(String contractId, TaskType taskType);

    // Find task assignment by milestone ID and task type
    Optional<TaskAssignment> findByMilestoneIdAndTaskType(String milestoneId, TaskType taskType);

    // Find all task assignments by contract ID and status
    List<TaskAssignment> findByContractIdAndStatus(String contractId, AssignmentStatus status);

    // Find all task assignments by multiple statuses (for schedulers / batch operations)
    List<TaskAssignment> findByStatusIn(List<AssignmentStatus> statuses);

    // Find task assignment by contract ID and assignment ID
    Optional<TaskAssignment> findByContractIdAndAssignmentId(String contractId, String assignmentId);

    // Count active assignments for a specialist (status = assigned or in_progress)
    long countBySpecialistIdAndStatusIn(String specialistId, List<AssignmentStatus> statuses);

    // Check if milestone already has accepted/active tasks
    boolean existsByMilestoneIdAndStatusIn(String milestoneId, Collection<AssignmentStatus> statuses);

    List<TaskAssignment> findByMilestoneIdIn(Collection<String> milestoneIds);

    /**
     * Find all task assignments for manager with filters and pagination (without keyword search)
     * Filters: contractIds (manager's contracts), status, taskType
     * Sort: hasIssue DESC, status priority, createdAt DESC (fallback assignedDate)
     */
    @Query("SELECT ta FROM TaskAssignment ta " +
           "WHERE ta.contractId IN :contractIds " +
           "AND (:status IS NULL OR ta.status = :status) " +
           "AND (:taskType IS NULL OR ta.taskType = :taskType) " +
           "ORDER BY " +
           "COALESCE(ta.createdAt, ta.assignedDate) DESC, " +
           "CASE WHEN ta.hasIssue = true THEN 0 ELSE 1 END, " +
           "CASE ta.status " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.in_progress THEN 0 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.assigned THEN 1 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.accepted_waiting THEN 2 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.ready_to_start THEN 3 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.completed THEN 4 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.cancelled THEN 5 " +
           "  ELSE 99 " +
           "END")
    Page<TaskAssignment> findAllByManagerWithFilters(
            @Param("contractIds") List<String> contractIds,
            @Param("status") AssignmentStatus status,
            @Param("taskType") TaskType taskType,
            Pageable pageable);

    /**
     * Find all task assignments for manager with filters, pagination and keyword search
     */
    @Query("SELECT ta FROM TaskAssignment ta " +
           "LEFT JOIN com.mutrapro.project_service.entity.Contract c ON ta.contractId = c.contractId " +
           "WHERE ta.contractId IN :contractIds " +
           "AND (:status IS NULL OR ta.status = :status) " +
           "AND (:taskType IS NULL OR ta.taskType = :taskType) " +
           "AND (LOWER(ta.contractId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.contractNumberSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.contractNameSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.milestoneId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistNameSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistUserIdSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY " +
           "COALESCE(ta.createdAt, ta.assignedDate) DESC, " +
           "CASE WHEN ta.hasIssue = true THEN 0 ELSE 1 END, " +
           "CASE ta.status " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.in_progress THEN 0 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.assigned THEN 1 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.accepted_waiting THEN 2 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.ready_to_start THEN 3 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.completed THEN 4 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.cancelled THEN 5 " +
           "  ELSE 99 " +
           "END")
    Page<TaskAssignment> findAllByManagerWithFiltersAndKeyword(
            @Param("contractIds") List<String> contractIds,
            @Param("status") AssignmentStatus status,
            @Param("taskType") TaskType taskType,
            @Param("keyword") String keyword,
            Pageable pageable);

    // --- Aggregation helpers for admin statistics ---
    long countByStatus(AssignmentStatus status);

    long countByTaskType(TaskType taskType);

    /**
     * Optimized versions joining Contract directly (manager view)
     */
    @Query("SELECT ta FROM TaskAssignment ta " +
           "INNER JOIN com.mutrapro.project_service.entity.Contract c ON ta.contractId = c.contractId " +
           "LEFT JOIN com.mutrapro.project_service.entity.ContractMilestone cm ON ta.milestoneId = cm.milestoneId " +
           "WHERE c.managerUserId = :managerUserId " +
           "AND c.status IN :contractStatuses " +
           "AND (:status IS NULL OR ta.status = :status) " +
           "AND (:taskType IS NULL OR ta.taskType = :taskType) " +
           "AND (:minProgress IS NULL OR COALESCE(ta.progressPercentage, 0) >= :minProgress) " +
           "AND (:maxProgress IS NULL OR COALESCE(ta.progressPercentage, 0) <= :maxProgress) " +
           "ORDER BY " +
           "COALESCE(ta.createdAt, ta.assignedDate) DESC, " +
           "CASE WHEN ta.hasIssue = true THEN 0 ELSE 1 END, " +
           "CASE ta.status " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.in_progress THEN 0 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.assigned THEN 1 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.accepted_waiting THEN 2 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.ready_to_start THEN 3 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.completed THEN 4 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.cancelled THEN 5 " +
           "  ELSE 99 " +
           "END")
    Page<TaskAssignment> findAllByManagerWithFiltersOptimized(
            @Param("managerUserId") String managerUserId,
            @Param("contractStatuses") List<ContractStatus> contractStatuses,
            @Param("status") AssignmentStatus status,
            @Param("taskType") TaskType taskType,
            @Param("minProgress") Integer minProgress,
            @Param("maxProgress") Integer maxProgress,
            Pageable pageable);

    @Query("SELECT ta FROM TaskAssignment ta " +
           "INNER JOIN com.mutrapro.project_service.entity.Contract c ON ta.contractId = c.contractId " +
           "LEFT JOIN com.mutrapro.project_service.entity.ContractMilestone cm ON ta.milestoneId = cm.milestoneId " +
           "WHERE c.managerUserId = :managerUserId " +
           "AND c.status IN :contractStatuses " +
           "AND (:status IS NULL OR ta.status = :status) " +
           "AND (:taskType IS NULL OR ta.taskType = :taskType) " +
           "AND (:minProgress IS NULL OR COALESCE(ta.progressPercentage, 0) >= :minProgress) " +
           "AND (:maxProgress IS NULL OR COALESCE(ta.progressPercentage, 0) <= :maxProgress) " +
           "AND (LOWER(ta.contractId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.contractNumberSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.contractNameSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.milestoneId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistNameSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistUserIdSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY " +
           "COALESCE(ta.createdAt, ta.assignedDate) DESC, " +
           "CASE WHEN ta.hasIssue = true THEN 0 ELSE 1 END, " +
           "CASE ta.status " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.in_progress THEN 0 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.assigned THEN 1 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.accepted_waiting THEN 2 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.ready_to_start THEN 3 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.completed THEN 4 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.cancelled THEN 5 " +
           "  ELSE 99 " +
           "END")
    Page<TaskAssignment> findAllByManagerWithFiltersAndKeywordOptimized(
            @Param("managerUserId") String managerUserId,
            @Param("contractStatuses") List<ContractStatus> contractStatuses,
            @Param("status") AssignmentStatus status,
            @Param("taskType") TaskType taskType,
            @Param("keyword") String keyword,
            @Param("minProgress") Integer minProgress,
            @Param("maxProgress") Integer maxProgress,
            Pageable pageable);
    
    /**
     * Find all task assignments with filters (không filter theo manager) - dùng cho SYSTEM_ADMIN
     */
    @Query("SELECT ta FROM TaskAssignment ta " +
           "INNER JOIN com.mutrapro.project_service.entity.Contract c ON ta.contractId = c.contractId " +
           "LEFT JOIN com.mutrapro.project_service.entity.ContractMilestone cm ON ta.milestoneId = cm.milestoneId " +
           "WHERE c.status IN :contractStatuses " +
           "AND (:status IS NULL OR ta.status = :status) " +
           "AND (:taskType IS NULL OR ta.taskType = :taskType) " +
           "AND (:minProgress IS NULL OR COALESCE(ta.progressPercentage, 0) >= :minProgress) " +
           "AND (:maxProgress IS NULL OR COALESCE(ta.progressPercentage, 0) <= :maxProgress) " +
           "ORDER BY " +
           "COALESCE(ta.createdAt, ta.assignedDate) DESC, " +
           "CASE WHEN ta.hasIssue = true THEN 0 ELSE 1 END, " +
           "CASE ta.status " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.in_progress THEN 0 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.assigned THEN 1 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.accepted_waiting THEN 2 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.ready_to_start THEN 3 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.completed THEN 4 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.cancelled THEN 5 " +
           "  ELSE 99 " +
           "END")
    Page<TaskAssignment> findAllWithFiltersOptimized(
            @Param("contractStatuses") List<ContractStatus> contractStatuses,
            @Param("status") AssignmentStatus status,
            @Param("taskType") TaskType taskType,
            @Param("minProgress") Integer minProgress,
            @Param("maxProgress") Integer maxProgress,
            Pageable pageable);
    
    @Query("SELECT ta FROM TaskAssignment ta " +
           "INNER JOIN com.mutrapro.project_service.entity.Contract c ON ta.contractId = c.contractId " +
           "LEFT JOIN com.mutrapro.project_service.entity.ContractMilestone cm ON ta.milestoneId = cm.milestoneId " +
           "WHERE c.status IN :contractStatuses " +
           "AND (:status IS NULL OR ta.status = :status) " +
           "AND (:taskType IS NULL OR ta.taskType = :taskType) " +
           "AND (:minProgress IS NULL OR COALESCE(ta.progressPercentage, 0) >= :minProgress) " +
           "AND (:maxProgress IS NULL OR COALESCE(ta.progressPercentage, 0) <= :maxProgress) " +
           "AND (LOWER(ta.contractId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(c.contractNumber) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.contractNumberSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.contractNameSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.milestoneId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistId) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistNameSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(ta.specialistUserIdSnapshot) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY " +
           "COALESCE(ta.createdAt, ta.assignedDate) DESC, " +
           "CASE WHEN ta.hasIssue = true THEN 0 ELSE 1 END, " +
           "CASE ta.status " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.in_progress THEN 0 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.assigned THEN 1 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.accepted_waiting THEN 2 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.ready_to_start THEN 3 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.completed THEN 4 " +
           "  WHEN com.mutrapro.project_service.enums.AssignmentStatus.cancelled THEN 5 " +
           "  ELSE 99 " +
           "END")
    Page<TaskAssignment> findAllWithFiltersAndKeywordOptimized(
            @Param("contractStatuses") List<ContractStatus> contractStatuses,
            @Param("status") AssignmentStatus status,
            @Param("taskType") TaskType taskType,
            @Param("keyword") String keyword,
            @Param("minProgress") Integer minProgress,
            @Param("maxProgress") Integer maxProgress,
            Pageable pageable);
}