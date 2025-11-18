package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.request.CreateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.UpdateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.mapper.TaskAssignmentMapper;
import com.mutrapro.project_service.exception.ContractMilestoneNotFoundException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.exception.InvalidMilestoneIdException;
import com.mutrapro.project_service.exception.InvalidTaskTypeException;
import com.mutrapro.project_service.exception.TaskAssignmentAlreadyCompletedException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.UserNotAuthenticatedException;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = PRIVATE, makeFinal = true)
public class TaskAssignmentService {

    TaskAssignmentRepository taskAssignmentRepository;
    ContractRepository contractRepository;
    ContractMilestoneRepository contractMilestoneRepository;
    TaskAssignmentMapper taskAssignmentMapper;

    /**
     * Lấy danh sách task assignments theo contract ID
     */
    public List<TaskAssignmentResponse> getTaskAssignmentsByContract(String contractId) {
        log.info("Getting task assignments for contract: contractId={}", contractId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission (manager of the contract)
        verifyManagerPermission(contract);
        
        List<TaskAssignment> assignments = taskAssignmentRepository.findByContractId(contractId);
        return taskAssignmentMapper.toResponseList(assignments);
    }

    /**
     * Lấy danh sách task assignments theo milestone ID
     */
    public List<TaskAssignmentResponse> getTaskAssignmentsByMilestone(
            String contractId, String milestoneId) {
        log.info("Getting task assignments for milestone: contractId={}, milestoneId={}", 
            contractId, milestoneId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Verify milestone exists and belongs to contract
        contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(milestoneId, contractId));
        
        List<TaskAssignment> assignments = taskAssignmentRepository
            .findByContractIdAndMilestoneId(contractId, milestoneId);
        return taskAssignmentMapper.toResponseList(assignments);
    }

    /**
     * Lấy chi tiết task assignment
     */
    public TaskAssignmentResponse getTaskAssignmentById(String contractId, String assignmentId) {
        log.info("Getting task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        TaskAssignment assignment = taskAssignmentRepository
            .findByContractIdAndAssignmentId(contractId, assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        return taskAssignmentMapper.toResponse(assignment);
    }

    /**
     * Tạo task assignment mới
     */
    @Transactional
    public TaskAssignmentResponse createTaskAssignment(
            String contractId, CreateTaskAssignmentRequest request) {
        log.info("Creating task assignment: contractId={}, specialistId={}, taskType={}", 
            contractId, request.getSpecialistId(), request.getTaskType());
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Verify contract is active (only active contracts can have task assignments)
        if (contract.getStatus() != ContractStatus.active) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId, 
                contract.getStatus(),
                "Cannot create task assignment: Contract is not active. Current status: " + contract.getStatus()
            );
        }
        
        // Verify task type matches contract type
        TaskType taskType = request.getTaskType();
        if (!isTaskTypeValidForContract(taskType, contract.getContractType())) {
            throw InvalidTaskTypeException.create(taskType, contract.getContractType().toString());
        }
        
        // Milestone is mandatory
        contractMilestoneRepository
            .findByMilestoneIdAndContractId(request.getMilestoneId(), contractId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(request.getMilestoneId(), contractId));
        
        // Create task assignment
        TaskAssignment assignment = TaskAssignment.builder()
            .contractId(contractId)
            .specialistId(request.getSpecialistId())
            .taskType(taskType)
            .status(AssignmentStatus.assigned)
            .milestoneId(request.getMilestoneId())
            .notes(request.getNotes())
            .assignedDate(java.time.Instant.now())
            .usedRevisions(0)
            .build();
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment created successfully: assignmentId={}", saved.getAssignmentId());
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Cập nhật task assignment
     */
    @Transactional
    public TaskAssignmentResponse updateTaskAssignment(
            String contractId, String assignmentId, UpdateTaskAssignmentRequest request) {
        log.info("Updating task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Find task assignment
        TaskAssignment assignment = taskAssignmentRepository
            .findByContractIdAndAssignmentId(contractId, assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Don't allow update if already completed
        if (assignment.getStatus() == AssignmentStatus.completed) {
            throw TaskAssignmentAlreadyCompletedException.cannotUpdate(assignmentId);
        }
        
        // Update fields
        if (request.getSpecialistId() != null) {
            assignment.setSpecialistId(request.getSpecialistId());
        }
        if (request.getTaskType() != null) {
            assignment.setTaskType(request.getTaskType());
        }
        if (request.getMilestoneId() != null) {
            if (request.getMilestoneId().isBlank()) {
                throw InvalidMilestoneIdException.cannotBeBlank();
            }
            contractMilestoneRepository
                .findByMilestoneIdAndContractId(request.getMilestoneId(), contractId)
                .orElseThrow(() -> ContractMilestoneNotFoundException.byId(request.getMilestoneId(), contractId));
            assignment.setMilestoneId(request.getMilestoneId());
        }
        if (request.getNotes() != null) {
            assignment.setNotes(request.getNotes());
        }
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment updated successfully: assignmentId={}", saved.getAssignmentId());
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Xóa task assignment
     */
    @Transactional
    public void deleteTaskAssignment(String contractId, String assignmentId) {
        log.info("Deleting task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Find task assignment
        TaskAssignment assignment = taskAssignmentRepository
            .findByContractIdAndAssignmentId(contractId, assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Don't allow delete if already completed
        if (assignment.getStatus() == AssignmentStatus.completed) {
            throw TaskAssignmentAlreadyCompletedException.cannotDelete(assignmentId);
        }
        
        taskAssignmentRepository.delete(assignment);
        log.info("Task assignment deleted successfully: assignmentId={}", assignmentId);
    }

    /**
     * Verify user is manager of the contract
     */
    private void verifyManagerPermission(Contract contract) {
        String currentUserId = getCurrentUserId();
        if (!contract.getManagerUserId().equals(currentUserId)) {
            throw UnauthorizedException.create(
                "Only the contract manager can manage task assignments");
        }
    }

    /**
     * Check if task type is valid for contract type
     */
    private boolean isTaskTypeValidForContract(TaskType taskType, 
            ContractType contractType) {
        return switch (contractType) {
            case transcription -> taskType == TaskType.transcription;
            case arrangement -> taskType == TaskType.arrangement;
            case recording -> taskType == TaskType.recording;
            case arrangement_with_recording -> 
                taskType == TaskType.arrangement || taskType == TaskType.recording;
            case bundle -> 
                taskType == TaskType.transcription 
                || taskType == TaskType.arrangement 
                || taskType == TaskType.recording;
        };
    }


    /**
     * Lấy current user ID từ JWT token
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            log.warn("userId claim not found in JWT, falling back to subject");
            return jwt.getSubject();
        }
        throw UserNotAuthenticatedException.create();
    }
}

