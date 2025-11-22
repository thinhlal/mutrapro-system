package com.mutrapro.project_service.service;

import com.mutrapro.project_service.client.NotificationServiceFeignClient;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.SpecialistServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateNotificationRequest;
import com.mutrapro.project_service.dto.request.CreateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.UpdateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
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
    RequestServiceFeignClient requestServiceFeignClient;

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
     * Lấy chi tiết task assignment của specialist hiện tại (với request info)
     */
    public TaskAssignmentResponse getMyTaskAssignmentById(String assignmentId) {
        log.info("Getting task assignment detail with request info: assignmentId={}", assignmentId);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only view your own task assignments");
        }
        
        // Map task assignment to response
        TaskAssignmentResponse response = taskAssignmentMapper.toResponse(assignment);
        
        // Fetch milestone info
        try {
            ContractMilestone milestone = contractMilestoneRepository
                .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                .orElse(null);
            if (milestone != null) {
                TaskAssignmentResponse.MilestoneInfo milestoneInfo = TaskAssignmentResponse.MilestoneInfo.builder()
                    .milestoneId(milestone.getMilestoneId())
                    .name(milestone.getName())
                    .description(milestone.getDescription())
                    .build();
                response.setMilestone(milestoneInfo);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch milestone info: milestoneId={}, contractId={}, error={}", 
                assignment.getMilestoneId(), assignment.getContractId(), e.getMessage());
            // Không fail nếu không load được milestone
        }
        
        // Fetch request info từ contract (chỉ cần requestId, không cần fetch toàn bộ contract)
        try {
            String requestId = contractRepository.findRequestIdByContractId(assignment.getContractId()).orElse(null);
            if (requestId != null) {
                try {
                    // Gọi request-service để lấy request details (đầy đủ thông tin)
                    ApiResponse<ServiceRequestInfoResponse> requestResponse = 
                        requestServiceFeignClient.getServiceRequestById(requestId);
                    if (requestResponse != null && "success".equals(requestResponse.getStatus()) 
                        && requestResponse.getData() != null) {
                        ServiceRequestInfoResponse requestData = requestResponse.getData();
                        
                        // Convert durationMinutes sang seconds
                        Integer durationSeconds = null;
                        if (requestData.getDurationMinutes() != null) {
                            try {
                                double minutes = requestData.getDurationMinutes().doubleValue();
                                durationSeconds = (int) Math.round(minutes * 60);
                            } catch (Exception ex) {
                                log.warn("Failed to convert durationMinutes to seconds: {}", ex.getMessage());
                            }
                        }
                        
                        // Extract tempo từ tempoPercentage
                        Integer tempo = null;
                        if (requestData.getTempoPercentage() != null) {
                            try {
                                tempo = requestData.getTempoPercentage().intValue();
                            } catch (Exception ex) {
                                log.warn("Failed to extract tempo: {}", ex.getMessage());
                            }
                        }
                        
                        // Extract timeSignature và specialNotes từ musicOptions
                        String timeSignature = null;
                        String specialNotes = null;
                        if (requestData.getMusicOptions() != null) {
                            try {
                                Map<String, Object> musicOptions = requestData.getMusicOptions();
                                if (musicOptions.get("timeSignature") != null) {
                                    timeSignature = musicOptions.get("timeSignature").toString();
                                }
                                if (musicOptions.get("specialNotes") != null) {
                                    specialNotes = musicOptions.get("specialNotes").toString();
                                }
                            } catch (Exception ex) {
                                log.warn("Failed to extract musicOptions: {}", ex.getMessage());
                            }
                        }
                        
                        // Map request info (đầy đủ thông tin cho specialist)
                        TaskAssignmentResponse.RequestInfo requestInfo = TaskAssignmentResponse.RequestInfo.builder()
                            .requestId(requestData.getRequestId())
                            .serviceType(requestData.getRequestType())
                            .title(requestData.getTitle())
                            .description(requestData.getDescription())
                            .durationSeconds(durationSeconds)
                            .tempo(tempo)
                            .timeSignature(timeSignature)
                            .specialNotes(specialNotes)
                            .instruments(requestData.getInstruments()) // List instruments nếu có
                            .files(requestData.getFiles()) // List files mà customer đã upload
                            .build();
                        response.setRequest(requestInfo);
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch request info: requestId={}, error={}", 
                        requestId, e.getMessage());
                    // Không fail nếu không load được request
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch requestId from contract: contractId={}, error={}", 
                assignment.getContractId(), e.getMessage());
            // Không fail nếu không load được requestId
        }
        
        return response;
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
                CreateNotificationRequest managerNotif = CreateNotificationRequest.builder()
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
                
                notificationServiceFeignClient.createNotification(managerNotif);
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
     * Specialist báo issue (không kịp deadline, có vấn đề)
     * Task vẫn giữ nguyên status IN_PROGRESS, chỉ đánh dấu hasIssue = true
     */
    @Transactional
    public TaskAssignmentResponse reportIssue(String assignmentId, String reason) {
        log.info("Specialist reporting issue: assignmentId={}, reason={}", assignmentId, reason);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only report issues for your own tasks");
        }
        
        // Only allow report issue if status is 'in_progress'
        if (assignment.getStatus() != AssignmentStatus.in_progress) {
            throw new RuntimeException(
                "Task assignment cannot report issue. Current status: " + assignment.getStatus());
        }
        
        // Set issue flag và thông tin
        assignment.setHasIssue(true);
        assignment.setIssueReason(reason);
        assignment.setIssueReportedAt(Instant.now());
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Issue reported successfully: assignmentId={}", assignmentId);
        
        // Gửi notification cho manager
        try {
            Contract contract = contractRepository.findById(assignment.getContractId())
                .orElse(null);
            
            if (contract != null && contract.getManagerUserId() != null) {
                CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                        .userId(contract.getManagerUserId())
                        .type(NotificationType.TASK_ASSIGNMENT_CANCELED) // Có thể tạo type mới TASK_ISSUE_REPORTED sau
                        .title("Task có vấn đề / không kịp deadline")
                        .content(String.format("Specialist đã báo issue cho task assignment của contract #%s. Task type: %s. Lý do: %s. Vui lòng kiểm tra và xử lý.", 
                                contract.getContractNumber() != null ? contract.getContractNumber() : assignment.getContractId(),
                                assignment.getTaskType(),
                                reason))
                        .referenceId(assignmentId)
                        .referenceType("TASK_ASSIGNMENT")
                        .actionUrl("/manager/task-assignments?contractId=" + assignment.getContractId())
                        .build();
                
                notificationServiceFeignClient.createNotification(notifRequest);
                log.info("Sent issue report notification to manager: userId={}, assignmentId={}, contractId={}", 
                        contract.getManagerUserId(), assignmentId, assignment.getContractId());
            } else {
                log.warn("Cannot send notification: contract not found or managerUserId is null. contractId={}, assignmentId={}", 
                        assignment.getContractId(), assignmentId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to send issue report notification: assignmentId={}, error={}", 
                    assignmentId, e.getMessage(), e);
        }
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Manager resolve issue (clear hasIssue flag - cho specialist tiếp tục)
     */
    @Transactional
    public TaskAssignmentResponse resolveIssue(String contractId, String assignmentId) {
        log.info("Manager resolving issue: contractId={}, assignmentId={}", contractId, assignmentId);
        
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
        
        // Only allow resolve if task has issue
        if (!Boolean.TRUE.equals(assignment.getHasIssue())) {
            throw new RuntimeException("Task assignment does not have an issue to resolve");
        }
        
        // Clear issue flag
        assignment.setHasIssue(false);
        assignment.setIssueReason(null);
        assignment.setIssueReportedAt(null);
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Issue resolved successfully: assignmentId={}, contractId={}", assignmentId, contractId);
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Manager cancel task (có thể cancel task ở bất kỳ status nào, trừ completed)
     * Giữ lại thông tin issue report (issueReason, issueReportedAt) để lưu lịch sử
     */
    @Transactional
    public TaskAssignmentResponse cancelTaskByManager(String contractId, String assignmentId) {
        log.info("Manager cancelling task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
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
        
        // Don't allow cancel if already completed
        if (assignment.getStatus() == AssignmentStatus.completed) {
            throw new RuntimeException("Cannot cancel task assignment that is already completed");
        }
        
        // Don't allow cancel if already cancelled
        if (assignment.getStatus() == AssignmentStatus.cancelled) {
            throw new RuntimeException("Task assignment is already cancelled");
        }
        
        // Set status to cancelled
        assignment.setStatus(AssignmentStatus.cancelled);
        assignment.setSpecialistRespondedAt(Instant.now());
        // Giữ lại thông tin issue report (issueReason, issueReportedAt) để lưu lịch sử
        // Chỉ clear hasIssue flag vì task đã bị cancel
        assignment.setHasIssue(false);
        // Không clear issueReason và issueReportedAt - giữ lại để biết lý do báo issue
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment cancelled by manager successfully: assignmentId={}, contractId={}, hadIssue={}", 
            assignmentId, contractId, saved.getIssueReason() != null);
        
        // Gửi notification cho specialist
        try {
            if (assignment.getSpecialistId() != null) {
                // Lấy userId của specialist từ specialistId
                ApiResponse<Map<String, Object>> specialistResponse = 
                    specialistServiceFeignClient.getSpecialistById(assignment.getSpecialistId());
                
                if (specialistResponse != null && "success".equals(specialistResponse.getStatus()) 
                    && specialistResponse.getData() != null) {
                    Map<String, Object> specialistData = specialistResponse.getData();
                    String specialistUserId = (String) specialistData.get("userId");
                    
                    if (specialistUserId != null && !specialistUserId.isEmpty()) {
                        String issueInfo = "";
                        if (saved.getIssueReason() != null) {
                            issueInfo = String.format(" (Bạn đã báo issue: %s)", saved.getIssueReason());
                        }
                        
                        CreateNotificationRequest specialistNotif = CreateNotificationRequest.builder()
                                .userId(specialistUserId)
                                .type(NotificationType.TASK_ASSIGNMENT_CANCELED)
                                .title("Task đã bị hủy bởi Manager")
                                .content(String.format("Manager đã hủy task %s cho contract #%s.%s Task sẽ được gán lại cho specialist khác.", 
                                        assignment.getTaskType(),
                                        contract.getContractNumber() != null ? contract.getContractNumber() : contractId,
                                        issueInfo))
                                .referenceId(assignmentId)
                                .referenceType("TASK_ASSIGNMENT")
                                .actionUrl("/transcription/my-tasks")
                                .build();
                        
                        notificationServiceFeignClient.createNotification(specialistNotif);
                        log.info("Sent task cancellation notification to specialist: userId={}, specialistId={}, assignmentId={}, contractId={}", 
                            specialistUserId, assignment.getSpecialistId(), assignmentId, contractId);
                    } else {
                        log.warn("Specialist userId not found in response: specialistId={}, assignmentId={}", 
                            assignment.getSpecialistId(), assignmentId);
                    }
                } else {
                    log.warn("Failed to get specialist info: specialistId={}, assignmentId={}", 
                        assignment.getSpecialistId(), assignmentId);
                }
            }
        } catch (Exception e) {
            log.error("Failed to send cancellation notification to specialist: assignmentId={}, error={}", 
                assignmentId, e.getMessage(), e);
        }
        
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

