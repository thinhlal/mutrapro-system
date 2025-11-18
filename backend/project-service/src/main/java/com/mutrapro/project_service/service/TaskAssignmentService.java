package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.NotificationServiceFeignClient;
import com.mutrapro.project_service.client.SpecialistServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateNotificationRequest;
import com.mutrapro.project_service.dto.request.CreateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.UpdateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.shared.enums.NotificationType;
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
import java.time.Instant;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

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
    SpecialistServiceFeignClient specialistServiceFeignClient;
    NotificationServiceFeignClient notificationServiceFeignClient;

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
     * Lấy danh sách task assignments của specialist hiện tại
     */
    public List<TaskAssignmentResponse> getMyTaskAssignments() {
        log.info("Getting task assignments for current specialist");
        String specialistId = getCurrentSpecialistId();
        List<TaskAssignment> assignments = taskAssignmentRepository.findBySpecialistId(specialistId);
        return taskAssignmentMapper.toResponseList(assignments);
    }

    /**
     * Lấy chi tiết task assignment của specialist hiện tại
     */
    public TaskAssignmentResponse getMyTaskAssignmentById(String assignmentId) {
        log.info("Getting task assignment detail: assignmentId={}", assignmentId);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only view your own task assignments");
        }
        
        return taskAssignmentMapper.toResponse(assignment);
    }

    /**
     * Specialist accept task (assigned → in_progress)
     */
    @Transactional
    public TaskAssignmentResponse acceptTaskAssignment(String assignmentId) {
        log.info("Specialist accepting task assignment: assignmentId={}", assignmentId);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only accept tasks assigned to you");
        }
        
        // Only allow accept if status is 'assigned'
        if (assignment.getStatus() != AssignmentStatus.assigned) {
            throw new RuntimeException(
                "Task assignment cannot be accepted. Current status: " + assignment.getStatus());
        }
        
        assignment.setStatus(AssignmentStatus.in_progress);
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment accepted successfully: assignmentId={}", assignmentId);
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Specialist cancel task (assigned → cancelled)
     */
    @Transactional
    public TaskAssignmentResponse cancelTaskAssignment(String assignmentId, String reason) {
        log.info("Specialist cancelling task assignment: assignmentId={}, reason={}", assignmentId, reason);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only cancel tasks assigned to you");
        }
        
        // Only allow cancel if status is 'assigned'
        if (assignment.getStatus() != AssignmentStatus.assigned) {
            throw new RuntimeException(
                "Task assignment cannot be cancelled. Current status: " + assignment.getStatus());
        }
        
        assignment.setStatus(AssignmentStatus.cancelled);
        assignment.setSpecialistResponseReason(reason);
        assignment.setSpecialistRespondedAt(Instant.now());
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment cancelled successfully: assignmentId={}, reason={}", assignmentId, reason);
        
        // Gửi notification cho manager
        try {
            Contract contract = contractRepository.findById(assignment.getContractId())
                .orElse(null);
            
            if (contract != null && contract.getManagerUserId() != null) {
                CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                        .userId(contract.getManagerUserId())
                        .type(NotificationType.TASK_ASSIGNMENT_CANCELED)
                        .title("Task assignment đã bị hủy")
                        .content(String.format("Specialist đã hủy task assignment cho contract #%s. Task type: %s. Lý do: %s", 
                                contract.getContractNumber() != null ? contract.getContractNumber() : assignment.getContractId(),
                                assignment.getTaskType(),
                                reason))
                        .referenceId(assignmentId)
                        .referenceType("TASK_ASSIGNMENT")
                        .actionUrl("/manager/task-assignments?contractId=" + assignment.getContractId())
                        .build();
                
                notificationServiceFeignClient.createNotification(notifRequest);
                log.info("Sent task cancellation notification to manager: userId={}, assignmentId={}, contractId={}", 
                        contract.getManagerUserId(), assignmentId, assignment.getContractId());
            } else {
                log.warn("Cannot send notification: contract not found or managerUserId is null. contractId={}, assignmentId={}", 
                        assignment.getContractId(), assignmentId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to send task cancellation notification: assignmentId={}, error={}", 
                    assignmentId, e.getMessage(), e);
        }
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Specialist request reassign task (in_progress → reassign_requested)
     */
    @Transactional
    public TaskAssignmentResponse requestReassign(String assignmentId, String reason) {
        log.info("Specialist requesting reassign: assignmentId={}, reason={}", assignmentId, reason);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only request reassign for your own tasks");
        }
        
        // Only allow request reassign if status is 'in_progress'
        if (assignment.getStatus() != AssignmentStatus.in_progress) {
            throw new RuntimeException(
                "Task assignment cannot be requested for reassign. Current status: " + assignment.getStatus());
        }
        
        assignment.setStatus(AssignmentStatus.reassign_requested);
        assignment.setReassignReason(reason);
        assignment.setReassignRequestedAt(Instant.now());
        assignment.setReassignRequestedBy(specialistId);
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Reassign requested successfully: assignmentId={}", assignmentId);
        
        // Gửi notification cho manager
        try {
            Contract contract = contractRepository.findById(assignment.getContractId())
                .orElse(null);
            
            if (contract != null && contract.getManagerUserId() != null) {
                CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                        .userId(contract.getManagerUserId())
                        .type(NotificationType.TASK_ASSIGNMENT_CANCELED) // Có thể tạo type mới sau
                        .title("Yêu cầu reassign task")
                        .content(String.format("Specialist đã yêu cầu reassign task assignment cho contract #%s. Task type: %s. Lý do: %s", 
                                contract.getContractNumber() != null ? contract.getContractNumber() : assignment.getContractId(),
                                assignment.getTaskType(),
                                reason))
                        .referenceId(assignmentId)
                        .referenceType("TASK_ASSIGNMENT")
                        .actionUrl("/manager/task-assignments?contractId=" + assignment.getContractId())
                        .build();
                
                notificationServiceFeignClient.createNotification(notifRequest);
                log.info("Sent reassign request notification to manager: userId={}, assignmentId={}, contractId={}", 
                        contract.getManagerUserId(), assignmentId, assignment.getContractId());
            }
        } catch (Exception e) {
            log.error("Failed to send reassign request notification: assignmentId={}, error={}", 
                    assignmentId, e.getMessage(), e);
        }
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Manager approve reassign request (reassign_requested → assigned)
     */
    @Transactional
    public TaskAssignmentResponse approveReassign(String contractId, String assignmentId, String decisionReason) {
        log.info("Manager approving reassign: contractId={}, assignmentId={}, reason={}", 
            contractId, assignmentId, decisionReason);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify contract exists and user has permission
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        verifyManagerPermission(contract);
        
        // Verify assignment belongs to contract
        if (!assignment.getContractId().equals(contractId)) {
            throw new RuntimeException("Task assignment does not belong to this contract");
        }
        
        // Only allow approve if status is 'reassign_requested'
        if (assignment.getStatus() != AssignmentStatus.reassign_requested) {
            throw new RuntimeException(
                "Task assignment cannot be approved for reassign. Current status: " + assignment.getStatus());
        }
        
        String managerUserId = getCurrentUserId();
        assignment.setStatus(AssignmentStatus.assigned);
        assignment.setReassignApprovedBy(managerUserId);
        assignment.setReassignApprovedAt(Instant.now());
        assignment.setReassignDecision("APPROVED");
        assignment.setReassignDecisionReason(decisionReason);
        // Clear specialist assignment để manager có thể assign lại
        // assignment.setSpecialistId(null); // Có thể giữ lại để biết ai đã làm trước đó
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Reassign approved successfully: assignmentId={}, contractId={}", assignmentId, contractId);
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Manager reject reassign request (reassign_requested → in_progress)
     */
    @Transactional
    public TaskAssignmentResponse rejectReassign(String contractId, String assignmentId, String decisionReason) {
        log.info("Manager rejecting reassign: contractId={}, assignmentId={}, reason={}", 
            contractId, assignmentId, decisionReason);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify contract exists and user has permission
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        verifyManagerPermission(contract);
        
        // Verify assignment belongs to contract
        if (!assignment.getContractId().equals(contractId)) {
            throw new RuntimeException("Task assignment does not belong to this contract");
        }
        
        // Only allow reject if status is 'reassign_requested'
        if (assignment.getStatus() != AssignmentStatus.reassign_requested) {
            throw new RuntimeException(
                "Task assignment cannot be rejected for reassign. Current status: " + assignment.getStatus());
        }
        
        String managerUserId = getCurrentUserId();
        assignment.setStatus(AssignmentStatus.in_progress);
        assignment.setReassignApprovedBy(managerUserId);
        assignment.setReassignApprovedAt(Instant.now());
        assignment.setReassignDecision("REJECTED");
        assignment.setReassignDecisionReason(decisionReason);
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Reassign rejected successfully: assignmentId={}, contractId={}", assignmentId, contractId);
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Lấy specialistId của user hiện tại từ specialist-service
     */
    private String getCurrentSpecialistId() {
        try {
            ApiResponse<Map<String, Object>> response = specialistServiceFeignClient.getMySpecialistInfo();
            if (response == null || !"success".equals(response.getStatus()) 
                || response.getData() == null) {
                throw UnauthorizedException.create("Specialist not found for current user");
            }
            Map<String, Object> data = response.getData();
            String specialistId = (String) data.get("specialistId");
            if (specialistId == null || specialistId.isEmpty()) {
                throw UnauthorizedException.create("Specialist ID not found in response");
            }
            return specialistId;
        } catch (Exception e) {
            log.error("Failed to get specialist info: {}", e.getMessage(), e);
            throw UnauthorizedException.create("Failed to get specialist information: " + e.getMessage());
        }
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

