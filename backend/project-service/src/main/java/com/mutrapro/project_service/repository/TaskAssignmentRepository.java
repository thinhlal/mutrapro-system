package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, String> {

    // Find all task assignments by contract ID
    List<TaskAssignment> findByContractId(String contractId);

    // Find all task assignments by milestone ID
    List<TaskAssignment> findByMilestoneId(String milestoneId);

    // Find all task assignments by contract ID and milestone ID
    List<TaskAssignment> findByContractIdAndMilestoneId(String contractId, String milestoneId);

    // Find all task assignments by specialist ID
    List<TaskAssignment> findBySpecialistId(String specialistId);

    // Find all task assignments by contract ID and task type
    List<TaskAssignment> findByContractIdAndTaskType(String contractId, TaskType taskType);

    // Find all task assignments by contract ID and status
    List<TaskAssignment> findByContractIdAndStatus(String contractId, AssignmentStatus status);

    // Find task assignment by contract ID and assignment ID
    Optional<TaskAssignment> findByContractIdAndAssignmentId(String contractId, String assignmentId);

    // Count active assignments for a specialist (status = assigned or in_progress)
    long countBySpecialistIdAndStatusIn(String specialistId, List<AssignmentStatus> statuses);
}

