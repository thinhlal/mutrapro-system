package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.request.ReviewRevisionRequest;
import com.mutrapro.project_service.dto.response.RevisionRequestResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.RevisionRequest;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.RevisionRequestStatus;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidStateException;
import com.mutrapro.project_service.exception.RevisionRequestNotFoundException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.ValidationException;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileSubmissionRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.RevisionRequestRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.shared.event.RevisionRequestedEvent;
import com.mutrapro.shared.event.RevisionDeliveredEvent;
import com.mutrapro.shared.event.RevisionSubmittedEvent;
import com.mutrapro.shared.event.RevisionApprovedEvent;
import com.mutrapro.shared.event.RevisionRejectedEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RevisionRequestService {

    RevisionRequestRepository revisionRequestRepository;
    TaskAssignmentRepository taskAssignmentRepository;
    ContractRepository contractRepository;
    ContractMilestoneRepository contractMilestoneRepository;
    FileSubmissionRepository fileSubmissionRepository;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;

    /**
     * Helper method để publish event vào outbox
     */
    private void publishToOutbox(Object event, String aggregateIdString, String aggregateType, String eventType) {
        try {
            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(aggregateIdString);
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType(aggregateType)
                    .eventType(eventType)
                    .eventPayload(payload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.debug("Queued event in outbox: eventType={}, aggregateId={}", eventType, aggregateId);
        } catch (Exception e) {
            log.error("Failed to enqueue event to outbox: eventType={}, aggregateId={}, error={}", 
                    eventType, aggregateIdString, e.getMessage(), e);
            // Không throw exception để không fail transaction
        }
    }

    /**
     * Check xem có revision request với status cụ thể cho assignment không
     */
    public boolean hasActiveRevisionRequest(String assignmentId, RevisionRequestStatus status) {
        List<RevisionRequest> revisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                assignmentId, status);
        return !revisions.isEmpty();
    }
    
    /**
     * Update revision request khi manager approve submission
     * Gọi từ FileSubmissionService.approveSubmission()
     */
    @Transactional
    public void updateRevisionRequestOnApproval(RevisionRequest revisionRequest, String managerUserId) {
        String revisionRequestId = revisionRequest.getRevisionRequestId();
        String assignmentId = revisionRequest.getTaskAssignmentId();
        
        // Update status: WAITING_MANAGER_REVIEW → APPROVED_PENDING_DELIVERY
        // (Manager đã approve nhưng chưa deliver)
        revisionRequest.setStatus(RevisionRequestStatus.APPROVED_PENDING_DELIVERY);
        revisionRequestRepository.save(revisionRequest);
        
        log.info("Updated revision request on approval: revisionRequestId={}, assignmentId={}, status=APPROVED_PENDING_DELIVERY", 
                revisionRequestId, assignmentId);
    }
    
    /**
     * Update revision request khi manager deliver submission
     * Gọi từ FileSubmissionService.deliverSubmission()
     * Nhận RevisionRequest trực tiếp (đã tìm ở ngoài để tránh query lại)
     */
    @Transactional
    public void updateRevisionRequestOnDelivery(RevisionRequest revisionRequest, String managerUserId) {
        String revisionRequestId = revisionRequest.getRevisionRequestId();
        String assignmentId = revisionRequest.getTaskAssignmentId();
        
        // Update status: APPROVED_PENDING_DELIVERY → WAITING_CUSTOMER_CONFIRM
        // (đã deliver cho customer)
        revisionRequest.setStatus(RevisionRequestStatus.WAITING_CUSTOMER_CONFIRM);
        revisionRequestRepository.save(revisionRequest);
        
        // Gửi Kafka event về revision delivered cho customer
        try {
            Contract contract = contractRepository.findById(revisionRequest.getContractId())
                    .orElse(null);
            
            if (contract != null && revisionRequest.getCustomerId() != null) {
                ContractMilestone milestone = contractMilestoneRepository
                        .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                        .orElse(null);
                String milestoneName = milestone != null && milestone.getName() != null
                        ? milestone.getName()
                        : "milestone";
                
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                        ? contract.getContractNumber()
                        : revisionRequest.getContractId();
                
                Instant now = Instant.now();
                RevisionDeliveredEvent event = RevisionDeliveredEvent.builder()
                        .eventId(UUID.randomUUID())
                        .revisionRequestId(revisionRequestId)
                        .submissionId(revisionRequest.getRevisedSubmissionId())
                        .contractId(revisionRequest.getContractId())
                        .contractNumber(contractLabel)
                        .milestoneId(revisionRequest.getMilestoneId())
                        .milestoneName(milestoneName)
                        .taskAssignmentId(assignmentId)
                        .customerUserId(revisionRequest.getCustomerId())
                        .revisionRound(revisionRequest.getRevisionRound())
                        .isFreeRevision(revisionRequest.getIsFreeRevision())
                        .title("Revision đã được chỉnh sửa")
                        .content(String.format("Manager đã gửi revision đã chỉnh sửa cho milestone \"%s\". Vui lòng xem xét và xác nhận.", 
                                milestoneName))
                        .referenceType("REVISION_REQUEST")
                        .actionUrl("/contracts/" + revisionRequest.getContractId() + "/milestones/" + revisionRequest.getMilestoneId() + "/deliveries")
                        .deliveredAt(now)
                        .timestamp(now)
                        .build();
                
                publishToOutbox(event, revisionRequestId, "RevisionRequest", "revision.delivered");
                log.info("Queued RevisionDeliveredEvent in outbox: eventId={}, revisionRequestId={}, customerUserId={}", 
                        event.getEventId(), revisionRequestId, revisionRequest.getCustomerId());
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue RevisionDeliveredEvent: revisionRequestId={}, error={}", 
                    revisionRequestId, e.getMessage(), e);
        }
        
        log.info("Updated revision request on delivery: revisionRequestId={}, assignmentId={}", 
                revisionRequestId, assignmentId);
    }
    
    /**
     * Update revision request khi manager reject submission
     * Gọi từ FileSubmissionService.rejectSubmission()
     */
    @Transactional
    public void updateRevisionRequestOnRejection(String assignmentId, String rejectionReason) {
        // Tìm revision request đang WAITING_MANAGER_REVIEW
        List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                assignmentId, RevisionRequestStatus.WAITING_MANAGER_REVIEW);
        
        if (activeRevisions.isEmpty()) {
            // Không có revision request đang chờ manager review, bỏ qua
            return;
        }
        
        // Lấy revision request đầu tiên (thường chỉ có 1)
        RevisionRequest revisionRequest = activeRevisions.get(0);
        String revisionRequestId = revisionRequest.getRevisionRequestId();
        
        // Update status: WAITING_MANAGER_REVIEW → IN_REVISION (quay lại cho specialist làm tiếp)
        revisionRequest.setStatus(RevisionRequestStatus.IN_REVISION);
        revisionRequest.setManagerNote(rejectionReason);
        revisionRequestRepository.save(revisionRequest);
        
        // Update task assignment status to revision_requested
        // (manager đã yêu cầu chỉnh sửa lại, phân biệt với in_revision - đang làm lần đầu)
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId).orElse(null);
        if (assignment != null && assignment.getStatus() != AssignmentStatus.revision_requested) {
            assignment.setStatus(AssignmentStatus.revision_requested);
            taskAssignmentRepository.save(assignment);
            log.info("Task assignment status updated to revision_requested after manager rejected revision submission: assignmentId={}", 
                    assignment.getAssignmentId());
        }
        
        // Gửi Kafka event về revision rejected cho specialist
        try {
            if (assignment != null) {
                String specialistUserId = assignment.getSpecialistUserIdSnapshot();
                if (specialistUserId != null && !specialistUserId.isBlank()) {
                    Contract contract = contractRepository.findById(revisionRequest.getContractId())
                            .orElse(null);
                    if (contract != null) {
                        ContractMilestone milestone = contractMilestoneRepository
                                .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                                .orElse(null);
                        String milestoneName = milestone != null && milestone.getName() != null
                                ? milestone.getName()
                                : "milestone";
                        
                        String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                                ? contract.getContractNumber()
                                : revisionRequest.getContractId();
                    
                    Instant now = Instant.now();
                    RevisionRejectedEvent event = RevisionRejectedEvent.builder()
                            .eventId(UUID.randomUUID())
                            .revisionRequestId(revisionRequestId)
                            .contractId(revisionRequest.getContractId())
                            .contractNumber(contractLabel)
                            .milestoneId(revisionRequest.getMilestoneId())
                            .milestoneName(milestoneName)
                            .taskAssignmentId(assignmentId)
                            .recipientUserId(specialistUserId)
                            .recipientType("SPECIALIST")
                            .managerUserId(contract.getManagerUserId())
                            .managerNote(rejectionReason)
                            .revisionRound(revisionRequest.getRevisionRound())
                            .isFreeRevision(revisionRequest.getIsFreeRevision())
                            .title("Revision cần chỉnh sửa lại")
                            .content(String.format("Manager đã từ chối revision cho milestone \"%s\". %s", 
                                    milestoneName,
                                    rejectionReason != null ? "Lý do: " + rejectionReason : "Vui lòng chỉnh sửa lại."))
                            .referenceType("REVISION_REQUEST")
                            .actionUrl("/transcription/my-tasks")
                            .rejectedAt(now)
                            .timestamp(now)
                            .build();
                    
                    publishToOutbox(event, revisionRequestId, "RevisionRequest", "revision.rejected");
                    log.info("Queued RevisionRejectedEvent in outbox: eventId={}, revisionRequestId={}, specialistUserId={}", 
                            event.getEventId(), revisionRequestId, specialistUserId);
                    }
                }
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue RevisionRejectedEvent: revisionRequestId={}, error={}", 
                    revisionRequestId, e.getMessage(), e);
        }
        
        log.info("Updated revision request on rejection: revisionRequestId={}, assignmentId={}", 
                revisionRequestId, assignmentId);
    }
    
    /**
     * Internal method to create revision request (called from FileSubmissionService)
     */
    @Transactional
    public RevisionRequestResponse createRevisionRequestInternal(
            String submissionId,
            String title,
            String description,
            String customerId,
            String contractId,
            String milestoneId,
            String taskAssignmentId) {
        
        log.info("Creating revision request: submissionId={}, contractId={}, taskAssignmentId={}", 
                submissionId, contractId, taskAssignmentId);
        
        // Calculate next revision round
        Integer nextRound = revisionRequestRepository.findNextRevisionRound(taskAssignmentId);
        
        // Check if it's free revision
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Đếm số revision requests đã có isFreeRevision = true cho contract này
        // (không phân biệt status, vì free revision được tính ngay khi tạo)
        long freeRevisionsUsed = revisionRequestRepository.findByContractId(contractId).stream()
                .filter(rr -> Boolean.TRUE.equals(rr.getIsFreeRevision()))
                .count();
        
        boolean isFreeRevision = freeRevisionsUsed < contract.getFreeRevisionsIncluded();
        
        Instant now = Instant.now();
        
        RevisionRequest revisionRequest = RevisionRequest.builder()
                .contractId(contractId)
                .milestoneId(milestoneId)
                .taskAssignmentId(taskAssignmentId)
                .originalSubmissionId(submissionId)  // Track submission ban đầu mà customer request revision
                .customerId(customerId)
                .managerId(contract.getManagerUserId())
                .title(title)
                .description(description)
                .revisionRound(nextRound)
                .isFreeRevision(isFreeRevision)
                .status(RevisionRequestStatus.PENDING_MANAGER_REVIEW)
                .requestedAt(now)
                .build();
        
        RevisionRequest saved = revisionRequestRepository.save(revisionRequest);
        
        // Gửi Kafka event về revision requested cho manager
        try {
            ContractMilestone milestone = contractMilestoneRepository
                    .findByMilestoneIdAndContractId(milestoneId, contractId)
                    .orElse(null);
            String milestoneName = milestone != null && milestone.getName() != null
                    ? milestone.getName()
                    : "milestone";
            
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : contractId;
            
            RevisionRequestedEvent event = RevisionRequestedEvent.builder()
                    .eventId(java.util.UUID.randomUUID())
                    .revisionRequestId(saved.getRevisionRequestId())
                    .contractId(contractId)
                    .contractNumber(contractLabel)
                    .milestoneId(milestoneId)
                    .milestoneName(milestoneName)
                    .taskAssignmentId(taskAssignmentId)
                    .customerUserId(customerId)
                    .managerUserId(contract.getManagerUserId())
                    .title("Customer yêu cầu chỉnh sửa")
                    .description(description)
                    .revisionRound(saved.getRevisionRound())
                    .isFreeRevision(saved.getIsFreeRevision())
                    .referenceType("REVISION_REQUEST")
                    .actionUrl("/manager/revision-requests")
                    .requestedAt(now)
                    .timestamp(now)
                    .build();
            
            publishToOutbox(event, saved.getRevisionRequestId(), "RevisionRequest", "revision.requested");
            log.info("Queued RevisionRequestedEvent in outbox: eventId={}, revisionRequestId={}, managerUserId={}", 
                    event.getEventId(), saved.getRevisionRequestId(), contract.getManagerUserId());
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue RevisionRequestedEvent: revisionRequestId={}, error={}", 
                    saved.getRevisionRequestId(), e.getMessage(), e);
        }
        
        log.info("Created revision request: revisionRequestId={}, revisionRound={}, isFreeRevision={}", 
                saved.getRevisionRequestId(), nextRound, isFreeRevision);
        
        return toResponse(saved);
    }

    /**
     * Manager approve/reject revision request
     */
    @Transactional
    public RevisionRequestResponse reviewRevisionRequest(
            String revisionRequestId,
            ReviewRevisionRequest request,
            String userId,
            List<String> userRoles) {
        
        log.info("Manager {} reviewing revision request: {}, action: {}", userId, revisionRequestId, request.getAction());
        
        // Verify user is MANAGER
        if (!userRoles.contains("MANAGER") && !userRoles.contains("SYSTEM_ADMIN")) {
            throw UnauthorizedException.create("Only managers can review revision requests");
        }
        
        RevisionRequest revisionRequest = revisionRequestRepository.findById(revisionRequestId)
                .orElseThrow(() -> RevisionRequestNotFoundException.byId(revisionRequestId));
        
        // Verify status is PENDING_MANAGER_REVIEW
        if (revisionRequest.getStatus() != RevisionRequestStatus.PENDING_MANAGER_REVIEW) {
            throw InvalidStateException.notPendingManagerReview(revisionRequestId, revisionRequest.getStatus().name());
        }
        
        // Verify manager has access to contract
        Contract contract = contractRepository.findById(revisionRequest.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(revisionRequest.getContractId()));
        
        if (!contract.getManagerUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only review revision requests from your contracts");
        }
        
        Instant now = Instant.now();
        
        if ("approve".equalsIgnoreCase(request.getAction())) {
            // Manager approves - send to specialist
            revisionRequest.setStatus(RevisionRequestStatus.IN_REVISION);
            revisionRequest.setManagerNote(request.getManagerNote());
            revisionRequest.setManagerReviewedAt(now);
            revisionRequest.setAssignedToSpecialistAt(now);
            
            // Set revision deadline: managerReviewedAt + revisionDeadlineDays từ contract
            Integer revisionDeadlineDays = contract.getRevisionDeadlineDays();
            if (revisionDeadlineDays != null && revisionDeadlineDays > 0) {
                revisionRequest.setRevisionDueAt(now.plus(revisionDeadlineDays, java.time.temporal.ChronoUnit.DAYS));
                log.info("Set revision deadline: revisionRequestId={}, revisionDueAt={}, revisionDeadlineDays={}", 
                        revisionRequestId, revisionRequest.getRevisionDueAt(), revisionDeadlineDays);
            } else {
                log.warn("Contract has no revisionDeadlineDays set, revision deadline not set: contractId={}, revisionRequestId={}", 
                        contract.getContractId(), revisionRequestId);
            }
            
            // Get task assignment and update status
            if (revisionRequest.getTaskAssignmentId() != null) {
                TaskAssignment assignment = taskAssignmentRepository.findById(revisionRequest.getTaskAssignmentId())
                        .orElseThrow(() -> TaskAssignmentNotFoundException.byId(revisionRequest.getTaskAssignmentId()));
                
                // Get specialistId from assignment
                revisionRequest.setSpecialistId(assignment.getSpecialistId());
                
                // Update assignment status to in_revision (customer revision request approved)
                // Clear completedDate khi revision lại (task chưa completed nữa)
                assignment.setStatus(AssignmentStatus.in_revision);
                assignment.setCompletedDate(null);
                taskAssignmentRepository.save(assignment);
                
                // Update milestone work status back to IN_PROGRESS (nếu đang WAITING_CUSTOMER)
                if (revisionRequest.getMilestoneId() != null) {
                    ContractMilestone milestone = contractMilestoneRepository
                            .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                            .orElse(null);
                    if (milestone != null && milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_CUSTOMER) {
                        milestone.setWorkStatus(MilestoneWorkStatus.IN_PROGRESS);
                        contractMilestoneRepository.save(milestone);
                        log.info("Milestone work status updated to IN_PROGRESS: milestoneId={}, contractId={}", 
                                milestone.getMilestoneId(), revisionRequest.getContractId());
                    }
                }
                
                // Gửi Kafka event về revision approved cho specialist
                try {
                    String specialistUserId = assignment.getSpecialistUserIdSnapshot();
                    if (specialistUserId != null && !specialistUserId.isBlank()) {
                        ContractMilestone milestone = contractMilestoneRepository
                                .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                                .orElse(null);
                        String milestoneName = milestone != null && milestone.getName() != null
                                ? milestone.getName()
                                : "milestone";
                        
                        String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                                ? contract.getContractNumber()
                                : revisionRequest.getContractId();
                        
                        RevisionApprovedEvent event = RevisionApprovedEvent.builder()
                                .eventId(UUID.randomUUID())
                                .revisionRequestId(revisionRequestId)
                                .contractId(revisionRequest.getContractId())
                                .contractNumber(contractLabel)
                                .milestoneId(revisionRequest.getMilestoneId())
                                .milestoneName(milestoneName)
                                .taskAssignmentId(revisionRequest.getTaskAssignmentId())
                                .specialistId(assignment.getSpecialistId())
                                .specialistUserId(specialistUserId)
                                .managerUserId(userId)
                                .revisionRound(revisionRequest.getRevisionRound())
                                .isFreeRevision(revisionRequest.getIsFreeRevision())
                                .managerNote(request.getManagerNote())
                                .title("Yêu cầu chỉnh sửa")
                                .content(String.format("Manager đã duyệt yêu cầu chỉnh sửa cho milestone \"%s\". %s", 
                                        milestoneName,
                                        revisionRequest.getDescription()))
                                .referenceType("REVISION_REQUEST")
                                .actionUrl("/transcription/my-tasks")
                                .approvedAt(now)
                                .timestamp(now)
                                .build();
                        
                        publishToOutbox(event, revisionRequestId, "RevisionRequest", "revision.approved");
                        log.info("Queued RevisionApprovedEvent in outbox: eventId={}, revisionRequestId={}, specialistUserId={}", 
                                event.getEventId(), revisionRequestId, specialistUserId);
                    }
                } catch (Exception e) {
                    // Log error nhưng không fail transaction
                    log.error("Failed to enqueue RevisionApprovedEvent: revisionRequestId={}, error={}", 
                            revisionRequestId, e.getMessage(), e);
                }
            }
            
            log.info("Manager approved revision request: revisionRequestId={}", revisionRequestId);
            
        } else if ("reject".equalsIgnoreCase(request.getAction())) {
            // Manager rejects
            revisionRequest.setStatus(RevisionRequestStatus.REJECTED);
            revisionRequest.setManagerNote(request.getManagerNote());
            revisionRequest.setManagerReviewedAt(now);
            
            // Gửi Kafka event về revision rejected cho customer
            try {
                ContractMilestone milestone = contractMilestoneRepository
                        .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                        .orElse(null);
                String milestoneName = milestone != null && milestone.getName() != null
                        ? milestone.getName()
                        : "milestone";
                
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                        ? contract.getContractNumber()
                        : contract.getContractId();
                
                RevisionRejectedEvent event = RevisionRejectedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .revisionRequestId(revisionRequestId)
                        .contractId(revisionRequest.getContractId())
                        .contractNumber(contractLabel)
                        .milestoneId(revisionRequest.getMilestoneId())
                        .milestoneName(milestoneName)
                        .taskAssignmentId(revisionRequest.getTaskAssignmentId())
                        .recipientUserId(revisionRequest.getCustomerId())
                        .recipientType("CUSTOMER")
                        .managerUserId(userId)
                        .managerNote(request.getManagerNote())
                        .revisionRound(revisionRequest.getRevisionRound())
                        .isFreeRevision(revisionRequest.getIsFreeRevision())
                        .title("Yêu cầu chỉnh sửa không được chấp nhận")
                        .content(String.format("Manager đã từ chối yêu cầu chỉnh sửa cho milestone \"%s\" của contract #%s. %s", 
                                milestoneName,
                                contractLabel,
                                request.getManagerNote() != null ? "Lý do: " + request.getManagerNote() : ""))
                        .referenceType("REVISION_REQUEST")
                        .actionUrl("/contracts/" + revisionRequest.getContractId())
                        .rejectedAt(now)
                        .timestamp(now)
                        .build();
                
                publishToOutbox(event, revisionRequestId, "RevisionRequest", "revision.rejected");
                log.info("Queued RevisionRejectedEvent in outbox: eventId={}, revisionRequestId={}, customerUserId={}", 
                        event.getEventId(), revisionRequestId, revisionRequest.getCustomerId());
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue RevisionRejectedEvent: revisionRequestId={}, error={}", 
                        revisionRequestId, e.getMessage(), e);
            }
            
            log.info("Manager rejected revision request: revisionRequestId={}", revisionRequestId);
            
        } else {
            throw ValidationException.invalidAction(request.getAction(), "'approve' or 'reject'");
        }
        
        revisionRequestRepository.save(revisionRequest);
        return toResponse(revisionRequest);
    }

    /**
     * Tự động update revision request khi specialist submit file for review
     * (gọi từ FileSubmissionService khi submit files)
     * Tìm revision request đang IN_REVISION và update status, track revised submission
     */
    @Transactional
    public void autoUpdateRevisionRequestOnFileSubmit(String assignmentId, String submissionId, String specialistUserId) {
        // Tìm revision request đang IN_REVISION cho assignment này
        List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                assignmentId, RevisionRequestStatus.IN_REVISION);
          
        if (activeRevisions.isEmpty()) {
            // Không có revision request nào đang IN_REVISION, không cần update
            return;
        }
        
        // Cảnh báo nếu có nhiều hơn 1 revision request IN_REVISION (theo logic chỉ nên có 1)
        if (activeRevisions.size() > 1) {
            log.warn("Found {} revision requests with IN_REVISION status for assignment {}. This should not happen. Processing the first one.", 
                    activeRevisions.size(), assignmentId);
        }
        
        // Lấy revision request đầu tiên (thường chỉ có 1)
        RevisionRequest revisionRequest = activeRevisions.get(0);
        String revisionRequestId = revisionRequest.getRevisionRequestId();
        
        try {
        // Verify status is IN_REVISION
        if (revisionRequest.getStatus() != RevisionRequestStatus.IN_REVISION) {
                log.warn("Revision request {} is not in revision. Current status: {}, skipping update", 
                        revisionRequestId, revisionRequest.getStatus());
                return;
        }
        
        // Verify specialist owns this revision request
        if (revisionRequest.getTaskAssignmentId() != null) {
                TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                        .orElse(null);
                if (assignment == null) {
                    log.warn("Task assignment not found: {}, skipping auto-update for revision request {}", 
                            assignmentId, revisionRequestId);
                    return;
                }
                
                String assignmentSpecialistUserId = assignment.getSpecialistUserIdSnapshot();
                if (assignmentSpecialistUserId == null || !assignmentSpecialistUserId.equals(specialistUserId)) {
                    log.warn("Specialist {} does not own revision request {}, skipping auto-update", 
                            specialistUserId, revisionRequestId);
                    return;
            }
        }
        
        Instant now = Instant.now();
        
            // Update revision request status - chờ manager review
            // Track submission mới sau khi specialist làm lại
            revisionRequest.setStatus(RevisionRequestStatus.WAITING_MANAGER_REVIEW);
            revisionRequest.setRevisedSubmissionId(submissionId);  // Track submission mới
        revisionRequest.setSpecialistSubmittedAt(now);
        revisionRequestRepository.save(revisionRequest);
        
            // Update submission để track revision request (để query ngược lại)
            fileSubmissionRepository.findById(submissionId).ifPresent(submission -> {
                submission.setRevisionRequestId(revisionRequestId);
                fileSubmissionRepository.save(submission);
                log.info("Updated submission with revision request ID: submissionId={}, revisionRequestId={}", 
                        submissionId, revisionRequestId);
            });
        
            // Gửi Kafka event về revision submitted cho manager
        try {
            Contract contract = contractRepository.findById(revisionRequest.getContractId())
                    .orElse(null);
            
                if (contract != null && contract.getManagerUserId() != null) {
                ContractMilestone milestone = contractMilestoneRepository
                        .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                        .orElse(null);
                String milestoneName = milestone != null && milestone.getName() != null
                        ? milestone.getName()
                        : "milestone";
                
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                        ? contract.getContractNumber()
                        : revisionRequest.getContractId();
                
                TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                        .orElse(null);
                String specialistId = assignment != null ? assignment.getSpecialistId() : null;
                // specialistUserId đã có từ parameter của method
                
                RevisionSubmittedEvent event = RevisionSubmittedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .revisionRequestId(revisionRequestId)
                        .submissionId(submissionId)
                        .contractId(revisionRequest.getContractId())
                        .contractNumber(contractLabel)
                        .milestoneId(revisionRequest.getMilestoneId())
                        .milestoneName(milestoneName)
                        .taskAssignmentId(assignmentId)
                        .specialistId(specialistId)
                        .specialistUserId(specialistUserId)
                        .managerUserId(contract.getManagerUserId())
                        .revisionRound(revisionRequest.getRevisionRound())
                        .isFreeRevision(revisionRequest.getIsFreeRevision())
                        .title("Revision đã được chỉnh sửa - cần review")
                        .content(String.format("Specialist đã hoàn thành chỉnh sửa cho milestone \"%s\". Vui lòng xem xét và duyệt trước khi gửi cho customer.", 
                                milestoneName))
                        .referenceType("REVISION_REQUEST")
                        .actionUrl("/manager/contracts/" + revisionRequest.getContractId() + "/tasks/" + assignmentId)
                        .submittedAt(now)
                        .timestamp(now)
                        .build();
                
                publishToOutbox(event, revisionRequestId, "RevisionRequest", "revision.submitted");
                log.info("Queued RevisionSubmittedEvent in outbox: eventId={}, revisionRequestId={}, managerUserId={}", 
                        event.getEventId(), revisionRequestId, contract.getManagerUserId());
            }
        } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue RevisionSubmittedEvent: revisionRequestId={}, error={}", 
                    revisionRequestId, e.getMessage(), e);
        }
        
            log.info("Auto-updated revision request on file submit: revisionRequestId={}, assignmentId={}", 
                    revisionRequestId, assignmentId);
        } catch (Exception e) {
            // Log error nhưng không throw để không fail transaction của file submission
            log.warn("Failed to auto-update revision request on file submit: revisionRequestId={}, assignmentId={}, error={}", 
                    revisionRequestId, assignmentId, e.getMessage());
        }
    }

    /**
     * Update revision request khi customer accept (gọi từ customerReviewSubmission)
     */
    @Transactional
    public void updateRevisionRequestOnCustomerAccept(String assignmentId, String userId) {
        List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                assignmentId, RevisionRequestStatus.WAITING_CUSTOMER_CONFIRM);
        
        if (activeRevisions.isEmpty()) {
            // Không có revision request đang chờ, đây là flow bình thường
            return;
        }
        
        if (activeRevisions.size() > 1) {
            log.warn("Multiple WAITING_CUSTOMER_CONFIRM revision requests found for assignment: assignmentId={}, count={}", 
                    assignmentId, activeRevisions.size());
        }
        
        RevisionRequest revisionRequest = activeRevisions.getFirst();
        
        // Verify customer owns this revision request
        if (!revisionRequest.getCustomerId().equals(userId)) {
            throw UnauthorizedException.create("You can only accept your own revision requests");
        }
        
        Instant now = Instant.now();
        
            // Customer accepts - mark as completed
            revisionRequest.setStatus(RevisionRequestStatus.COMPLETED);
            revisionRequest.setCustomerConfirmedAt(now);
            revisionRequestRepository.save(revisionRequest);
            
            // Update task assignment status to completed
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
                
                assignment.setStatus(AssignmentStatus.completed);
                assignment.setCompletedDate(now);
                taskAssignmentRepository.save(assignment);
        
        // Update milestone work status: WAITING_CUSTOMER → READY_FOR_PAYMENT
        if (revisionRequest.getMilestoneId() != null && revisionRequest.getContractId() != null) {
            ContractMilestone milestone = contractMilestoneRepository
                    .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                    .orElse(null);
            if (milestone != null && milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_CUSTOMER) {
                milestone.setWorkStatus(MilestoneWorkStatus.READY_FOR_PAYMENT);
                
                // Track finalCompletedAt: lúc customer chấp nhận bản cuối cùng (sau mọi revision)
                LocalDateTime completedAt = now.atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
                milestone.setFinalCompletedAt(completedAt);
                log.info("Tracked final completion time for milestone: milestoneId={}, finalCompletedAt={}", 
                        milestone.getMilestoneId(), milestone.getFinalCompletedAt());
                
                contractMilestoneRepository.save(milestone);
                log.info("Milestone work status updated to READY_FOR_PAYMENT after customer accepted revision: milestoneId={}, contractId={}", 
                        milestone.getMilestoneId(), revisionRequest.getContractId());
            }
        }
        
        log.info("Customer accepted revision: revisionRequestId={}, assignmentId={}", 
                revisionRequest.getRevisionRequestId(), assignmentId);
    }
    
    /**
     * Update revision request khi customer reject và tạo revision request mới (gọi từ customerReviewSubmission)
     */
    @Transactional
    public void updateRevisionRequestOnCustomerReject(
            String assignmentId, 
            String userId,
            String title,
            String description) {
        
        List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                assignmentId, RevisionRequestStatus.WAITING_CUSTOMER_CONFIRM);
        
        if (activeRevisions.isEmpty()) {
            // Không có revision request đang chờ, đây là flow bình thường (tạo revision request mới)
            return;
        }
        
        if (activeRevisions.size() > 1) {
            log.warn("Multiple WAITING_CUSTOMER_CONFIRM revision requests found for assignment: assignmentId={}, count={}", 
                    assignmentId, activeRevisions.size());
        }
        
        RevisionRequest revisionRequest = activeRevisions.getFirst();
        
        // Verify customer owns this revision request
        if (!revisionRequest.getCustomerId().equals(userId)) {
            throw UnauthorizedException.create("You can only reject your own revision requests");
        }
        
        Instant now = Instant.now();
        
        // Customer rejects - mark old one as completed (rejected)
        revisionRequest.setStatus(RevisionRequestStatus.COMPLETED);
            revisionRequest.setCustomerConfirmedAt(now);
            revisionRequestRepository.save(revisionRequest);
            
            // Create new revision request for next round
        Integer nextRound = revisionRequestRepository.findNextRevisionRound(assignmentId);
        
        // Get contract to get managerId and check free revisions
        Contract contract = contractRepository.findById(revisionRequest.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(revisionRequest.getContractId()));
        
        // Đếm số revision requests đã có isFreeRevision = true cho contract này
        // (không phân biệt status, vì free revision được tính ngay khi tạo)
        long freeRevisionsUsed = revisionRequestRepository.findByContractId(revisionRequest.getContractId()).stream()
                .filter(rr -> Boolean.TRUE.equals(rr.getIsFreeRevision()))
                .count();
        
        boolean isFreeRevision = freeRevisionsUsed < contract.getFreeRevisionsIncluded();
            
        RevisionRequest newRevisionRequest = RevisionRequest.builder()
                .contractId(revisionRequest.getContractId())
                .milestoneId(revisionRequest.getMilestoneId())
                .taskAssignmentId(assignmentId)
                .customerId(userId)
                .managerId(contract.getManagerUserId())  // Set managerId ngay từ đầu
                .title(title)
                .description(description)
                .revisionRound(nextRound)
                .isFreeRevision(isFreeRevision)  // Tính toán dựa trên số free revisions đã dùng
                .status(RevisionRequestStatus.PENDING_MANAGER_REVIEW)
                .requestedAt(now)
                .build();
            
            RevisionRequest saved = revisionRequestRepository.save(newRevisionRequest);
            
            // Gửi Kafka event về revision requested cho manager
            try {
                if (contract != null && contract.getManagerUserId() != null) {
                    ContractMilestone milestone = contractMilestoneRepository
                            .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                            .orElse(null);
                    String milestoneName = milestone != null && milestone.getName() != null
                            ? milestone.getName()
                            : "milestone";
                    
                    String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                            ? contract.getContractNumber()
                            : revisionRequest.getContractId();
                    
                    RevisionRequestedEvent event = RevisionRequestedEvent.builder()
                            .eventId(UUID.randomUUID())
                            .revisionRequestId(saved.getRevisionRequestId())
                            .contractId(revisionRequest.getContractId())
                            .contractNumber(contractLabel)
                            .milestoneId(revisionRequest.getMilestoneId())
                            .milestoneName(milestoneName)
                            .taskAssignmentId(assignmentId)
                            .customerUserId(userId)
                            .managerUserId(contract.getManagerUserId())
                            .title("Customer yêu cầu chỉnh sửa lại")
                            .description(description)
                            .revisionRound(saved.getRevisionRound())
                            .isFreeRevision(saved.getIsFreeRevision())
                            .referenceType("REVISION_REQUEST")
                            .actionUrl("/manager/revision-requests")
                            .requestedAt(now)
                            .timestamp(now)
                            .build();
                    
                    publishToOutbox(event, saved.getRevisionRequestId(), "RevisionRequest", "revision.requested");
                    log.info("Queued RevisionRequestedEvent in outbox: eventId={}, revisionRequestId={}, managerUserId={}", 
                            event.getEventId(), saved.getRevisionRequestId(), contract.getManagerUserId());
                }
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue RevisionRequestedEvent: revisionRequestId={}, error={}", 
                        saved.getRevisionRequestId(), e.getMessage(), e);
            }
            
        log.info("Customer rejected revision, created new revision request: oldRevisionRequestId={}, newRevisionRequestId={}, assignmentId={}", 
                revisionRequest.getRevisionRequestId(), saved.getRevisionRequestId(), assignmentId);
    }

    /**
     * Get all revision requests by assignment ID (for manager and specialist)
     */
    public List<RevisionRequestResponse> getRevisionRequestsByAssignmentId(
            String assignmentId,
            String userId,
            List<String> userRoles) {
        log.info("Getting revision requests for assignment: {}, userId: {}", assignmentId, userId);
        
        // Verify assignment exists
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify user has permission
        // Manager: must own the contract
        // Specialist: must own the assignment
        // Customer: must own the contract
        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));
        
        if (userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("MANAGER") || role.equalsIgnoreCase("SYSTEM_ADMIN"))) {
            if (!contract.getManagerUserId().equals(userId)) {
                throw UnauthorizedException.create("You can only view revision requests from your contracts");
            }
        } else if (userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("TRANSCRIPTION") || 
                role.equalsIgnoreCase("ARRANGEMENT") || 
                role.equalsIgnoreCase("RECORDING_ARTIST"))) {
            // Check specialistUserIdSnapshot (not specialistId) because userId is from user-service
            String specialistUserId = assignment.getSpecialistUserIdSnapshot();
            if (specialistUserId == null || !specialistUserId.equals(userId)) {
                throw UnauthorizedException.create("You can only view revision requests from your own assignments");
            }
        } else if (userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("CUSTOMER"))) {
            // Customer can view revision requests for assignments in their contracts
            if (!contract.getUserId().equals(userId)) {
                throw UnauthorizedException.create("You can only view revision requests from your own contracts");
            }
        } else {
            throw UnauthorizedException.create("You don't have permission to view revision requests");
        }
        
        // Get all revision requests for this assignment
        List<RevisionRequest> revisionRequests = revisionRequestRepository.findByTaskAssignmentId(assignmentId);
        
        return revisionRequests.stream()
                .map(this::toResponse)
                .toList();
    }
    
    /**
     * Get all revision requests for a manager (with optional status filter)
     */
    public List<RevisionRequestResponse> getRevisionRequestsByManager(
            String managerId,
            RevisionRequestStatus status) {
        log.info("Getting revision requests for manager: {}, status: {}", managerId, status);
        
        List<RevisionRequest> revisionRequests;
        if (status != null) {
            // Find by manager ID and status
            revisionRequests = revisionRequestRepository.findByManagerId(managerId).stream()
                    .filter(rr -> rr.getStatus() == status)
                    .toList();
        } else {
            // Find all by manager ID
            revisionRequests = revisionRequestRepository.findByManagerId(managerId);
        }
        
        // Sort by requestedAt descending (newest first)
        revisionRequests = revisionRequests.stream()
                .sorted((a, b) -> {
                    if (a.getRequestedAt() == null && b.getRequestedAt() == null) return 0;
                    if (a.getRequestedAt() == null) return 1;
                    if (b.getRequestedAt() == null) return -1;
                    return b.getRequestedAt().compareTo(a.getRequestedAt());
                })
                .toList();
        log.info("Revision requests:ssss {}", revisionRequests);
        
        return revisionRequests.stream()
                .map(this::toResponse)
                .toList();
    }
    
    /**
     * Batch get revision requests by multiple assignment IDs (optimized for performance)
     * This method assumes permission has already been verified at contract level
     * 
     * @param assignmentIds List of assignment IDs
     * @param contractId Contract ID (for permission verification)
     * @param userId User ID
     * @param userRoles User roles
     * @return List of revision request responses
     */
    public List<RevisionRequestResponse> getRevisionRequestsByAssignmentIds(
            List<String> assignmentIds,
            String contractId,
            String userId,
            List<String> userRoles) {
        
        if (assignmentIds == null || assignmentIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        
        log.info("Batch getting revision requests for {} assignments, contractId: {}, userId: {}", 
                assignmentIds.size(), contractId, userId);
        
        // Verify contract access (only need to check once for all assignments)
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission at contract level
        if (userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("MANAGER") || role.equalsIgnoreCase("SYSTEM_ADMIN"))) {
            if (!contract.getManagerUserId().equals(userId)) {
                throw UnauthorizedException.create("You can only view revision requests from your contracts");
            }
        } else if (userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("CUSTOMER"))) {
            if (!contract.getUserId().equals(userId)) {
                throw UnauthorizedException.create("You can only view revision requests from your own contracts");
            }
        } else if (userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("TRANSCRIPTION") || 
                role.equalsIgnoreCase("ARRANGEMENT") || 
                role.equalsIgnoreCase("RECORDING_ARTIST"))) {
            // Specialists: Permission check will be done after loading assignments
            // We load all revision requests first, then filter by assignment ownership
            // This avoids N+1 queries (checking each assignment individually)
        } else {
            throw UnauthorizedException.create("You don't have permission to view revision requests");
        }
        
        // Batch query all revision requests in one go
        List<RevisionRequest> revisionRequests = revisionRequestRepository.findByTaskAssignmentIdIn(assignmentIds);
        
        // For specialists, filter by assignment ownership
        if (userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("TRANSCRIPTION") || 
                role.equalsIgnoreCase("ARRANGEMENT") || 
                role.equalsIgnoreCase("RECORDING_ARTIST"))) {
            // Get all assignments to check ownership
            List<TaskAssignment> assignments = taskAssignmentRepository.findAllById(assignmentIds);
            Set<String> ownedAssignmentIds = assignments.stream()
                    .filter(a -> userId.equals(a.getSpecialistId()))
                    .map(TaskAssignment::getAssignmentId)
                    .collect(Collectors.toSet());
            
            // Filter revision requests to only include those from owned assignments
            revisionRequests = revisionRequests.stream()
                    .filter(rr -> ownedAssignmentIds.contains(rr.getTaskAssignmentId()))
                    .collect(Collectors.toList());
        }
        
        return revisionRequests.stream()
                .map(this::toResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Convert entity to response DTO
     */
    private RevisionRequestResponse toResponse(RevisionRequest revisionRequest) {
        // Get contract để lấy revisionDeadlineDays
        Contract contract = contractRepository.findById(revisionRequest.getContractId()).orElse(null);
        Integer revisionDeadlineDays = contract != null ? contract.getRevisionDeadlineDays() : null;
        
        return RevisionRequestResponse.builder()
                .revisionRequestId(revisionRequest.getRevisionRequestId())
                .contractId(revisionRequest.getContractId())
                .milestoneId(revisionRequest.getMilestoneId())
                .taskAssignmentId(revisionRequest.getTaskAssignmentId())
                .originalSubmissionId(revisionRequest.getOriginalSubmissionId())
                .revisedSubmissionId(revisionRequest.getRevisedSubmissionId())
                .customerId(revisionRequest.getCustomerId())
                .managerId(revisionRequest.getManagerId())
                .specialistId(revisionRequest.getSpecialistId())
                .title(revisionRequest.getTitle())
                .description(revisionRequest.getDescription())
                .managerNote(revisionRequest.getManagerNote())
                .specialistNote(revisionRequest.getSpecialistNote())
                .revisionRound(revisionRequest.getRevisionRound())
                .isFreeRevision(revisionRequest.getIsFreeRevision())
                .status(revisionRequest.getStatus() != null ? revisionRequest.getStatus().name() : null)
                .requestedAt(revisionRequest.getRequestedAt())
                .managerReviewedAt(revisionRequest.getManagerReviewedAt())
                .revisionDueAt(revisionRequest.getRevisionDueAt())
                .revisionDeadlineDays(revisionDeadlineDays)  // Số ngày SLA để hoàn thành revision
                .assignedToSpecialistAt(revisionRequest.getAssignedToSpecialistAt())
                .specialistSubmittedAt(revisionRequest.getSpecialistSubmittedAt())
                .customerConfirmedAt(revisionRequest.getCustomerConfirmedAt())
                .canceledAt(revisionRequest.getCanceledAt())
                .createdAt(revisionRequest.getCreatedAt() != null ? revisionRequest.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant() : null)
                .updatedAt(revisionRequest.getUpdatedAt() != null ? revisionRequest.getUpdatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant() : null)
                .createdBy(revisionRequest.getCreatedBy())
                .updatedBy(revisionRequest.getUpdatedBy())
                .build();
    }
}

