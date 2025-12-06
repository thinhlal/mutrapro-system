package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.request.ReviewRevisionRequest;
import com.mutrapro.project_service.dto.response.ContractRevisionStatsResponse;
import com.mutrapro.project_service.dto.response.RevisionRequestResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.FileSubmission;
import com.mutrapro.project_service.entity.RevisionRequest;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.RevisionRequestStatus;
import com.mutrapro.project_service.enums.SubmissionStatus;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidStateException;
import com.mutrapro.project_service.exception.RevisionRequestNotFoundException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.ValidationException;
import com.mutrapro.project_service.repository.ContractInstallmentRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileSubmissionRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.RevisionRequestRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.project_service.entity.ContractInstallment;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.shared.event.RevisionRequestedEvent;
import com.mutrapro.shared.event.RevisionDeliveredEvent;
import com.mutrapro.shared.event.RevisionSubmittedEvent;
import com.mutrapro.shared.event.RevisionApprovedEvent;
import com.mutrapro.shared.event.RevisionRejectedEvent;
import com.mutrapro.shared.event.RevisionFeeRefundedEvent;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    ContractInstallmentRepository contractInstallmentRepository;
    FileSubmissionRepository fileSubmissionRepository;
    OutboxEventRepository outboxEventRepository;
    ContractService contractService;
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
                
                LocalDateTime now = LocalDateTime.now();
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
                    
                    LocalDateTime now = LocalDateTime.now();
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
     * Internal method to create revision request (called from FileSubmissionService or event consumer)
     * @param paidWalletTxId ID của wallet transaction nếu là paid revision (null nếu free)
     */
    @Transactional
    public RevisionRequestResponse createRevisionRequestInternal(
            String submissionId,
            String title,
            String description,
            String customerId,
            String contractId,
            String milestoneId,
            String taskAssignmentId,
            String paidWalletTxId) {
        
        log.info("Creating revision request: submissionId={}, contractId={}, taskAssignmentId={}, paidWalletTxId={}", 
                submissionId, contractId, taskAssignmentId, paidWalletTxId);
        
        // Calculate next revision round
        Integer nextRound = revisionRequestRepository.findNextRevisionRound(taskAssignmentId);
        
        // Check if it's free revision
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Đếm số revision requests đã có isFreeRevision = true và KHÔNG bị REJECTED cho contract này
        // Đếm tất cả revision free (kể cả đang pending, in_revision, waiting_customer_confirm, completed)
        // CHỈ loại trừ REJECTED (vì revision bị reject không được tính là đã sử dụng lượt free)
        long freeRevisionsUsed = revisionRequestRepository.findByContractId(contractId).stream()
                .filter(rr -> Boolean.TRUE.equals(rr.getIsFreeRevision()) 
                        && rr.getStatus() != RevisionRequestStatus.REJECTED
                        && rr.getStatus() != RevisionRequestStatus.CANCELED)
                .count();
        
        boolean isFreeRevision = paidWalletTxId == null && freeRevisionsUsed < contract.getFreeRevisionsIncluded();
        
        // Validate: nếu có paidWalletTxId thì phải là paid revision
        if (paidWalletTxId != null && isFreeRevision) {
            log.warn("paidWalletTxId provided but revision should be free: contractId={}, freeRevisionsUsed={}, freeRevisionsIncluded={}", 
                    contractId, freeRevisionsUsed, contract.getFreeRevisionsIncluded());
            // Vẫn tạo như paid revision vì đã có transaction
            isFreeRevision = false;
        }
        
        LocalDateTime now = LocalDateTime.now();
        
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
                .paidWalletTxId(paidWalletTxId)  // Set nếu là paid revision
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
                    .eventId(UUID.randomUUID())
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
        
        LocalDateTime now = LocalDateTime.now();
        
        if ("approve".equalsIgnoreCase(request.getAction())) {
            // Manager approves - send to specialist
            revisionRequest.setStatus(RevisionRequestStatus.IN_REVISION);
            revisionRequest.setManagerNote(request.getManagerNote());
            revisionRequest.setManagerReviewedAt(now);
            revisionRequest.setAssignedToSpecialistAt(now);
            
            // Set revision deadline: managerReviewedAt + revisionDeadlineDays từ contract
            Integer revisionDeadlineDays = contract.getRevisionDeadlineDays();
            if (revisionDeadlineDays != null && revisionDeadlineDays > 0) {
                revisionRequest.setRevisionDueAt(now.plusDays(revisionDeadlineDays));
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
                
                // Update original submission status to customer_rejected (khi manager approve revision request)
                if (revisionRequest.getOriginalSubmissionId() != null) {
                    try {
                        FileSubmission originalSubmission = fileSubmissionRepository.findById(revisionRequest.getOriginalSubmissionId())
                                .orElse(null);
                        if (originalSubmission != null) {
                            // Chỉ set nếu submission đang ở delivered hoặc customer_accepted
                            // (tránh set lại nếu đã là customer_rejected rồi)
                            if (originalSubmission.getStatus() == SubmissionStatus.delivered || 
                                originalSubmission.getStatus() == SubmissionStatus.customer_accepted) {
                                originalSubmission.setStatus(SubmissionStatus.customer_rejected);
                                fileSubmissionRepository.save(originalSubmission);
                                log.info("Original submission status updated to customer_rejected: submissionId={}, revisionRequestId={}", 
                                        revisionRequest.getOriginalSubmissionId(), revisionRequest.getRevisionRequestId());
                            }
                        } else {
                            log.warn("Original submission not found: submissionId={}, revisionRequestId={}", 
                                    revisionRequest.getOriginalSubmissionId(), revisionRequest.getRevisionRequestId());
                        }
                    } catch (Exception e) {
                        log.error("Failed to update original submission status: submissionId={}, revisionRequestId={}, error={}", 
                                revisionRequest.getOriginalSubmissionId(), revisionRequest.getRevisionRequestId(), e.getMessage(), e);
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
            
            // Nếu là paid revision → cần refund tiền cho customer
            // (billing service sẽ xử lý refund qua Kafka event)
            boolean isPaidRevision = revisionRequest.getPaidWalletTxId() != null && !revisionRequest.getPaidWalletTxId().isBlank();
            
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
                        .paidWalletTxId(revisionRequest.getPaidWalletTxId())  // Để notification service hiển thị
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
                log.info("Queued RevisionRejectedEvent in outbox: eventId={}, revisionRequestId={}, customerUserId={}, isPaidRevision={}, paidWalletTxId={}", 
                        event.getEventId(), revisionRequestId, revisionRequest.getCustomerId(), isPaidRevision, revisionRequest.getPaidWalletTxId());
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue RevisionRejectedEvent: revisionRequestId={}, error={}", 
                        revisionRequestId, e.getMessage(), e);
            }
            
            // Nếu là paid revision → gửi event để billing service refund
            // Billing service sẽ refund và publish lại event với đầy đủ thông tin cho notification service
            if (isPaidRevision) {
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
                    
                    // Event này chỉ để billing service refund, không phải để notification
                    // Billing service sẽ publish lại event với đầy đủ thông tin sau khi refund thành công
                    RevisionFeeRefundedEvent refundEvent = RevisionFeeRefundedEvent.builder()
                            .eventId(UUID.randomUUID())
                            .revisionRequestId(revisionRequestId)
                            .contractId(revisionRequest.getContractId())
                            .contractNumber(contractLabel)
                            .milestoneId(revisionRequest.getMilestoneId())
                            .milestoneName(milestoneName)
                            .taskAssignmentId(revisionRequest.getTaskAssignmentId())
                            .customerUserId(revisionRequest.getCustomerId())
                            .paidWalletTxId(revisionRequest.getPaidWalletTxId())
                            .refundAmount(null)  // Billing service sẽ tự lấy từ transaction
                            .currency(null)  // Billing service sẽ tự lấy từ transaction
                            .refundReason(request.getManagerNote() != null ? request.getManagerNote() : "Manager rejected revision request")
                            .managerUserId(userId)
                            .refundedAt(now)
                            .timestamp(now)
                            .build();
                    
                    publishToOutbox(refundEvent, revisionRequestId, "RevisionRequest", "billing.revision.fee.refunded");
                    log.info("Queued RevisionFeeRefundedEvent for billing service to refund: eventId={}, revisionRequestId={}, paidWalletTxId={}", 
                            refundEvent.getEventId(), revisionRequestId, revisionRequest.getPaidWalletTxId());
                } catch (Exception e) {
                    // Log error nhưng không fail transaction
                    log.error("Failed to enqueue RevisionFeeRefundedEvent: revisionRequestId={}, error={}", 
                            revisionRequestId, e.getMessage(), e);
                }
            }
            
            log.info("Manager rejected revision request: revisionRequestId={}, isPaidRevision={}, paidWalletTxId={}", 
                    revisionRequestId, isPaidRevision, revisionRequest.getPaidWalletTxId());
            
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
        
        LocalDateTime now = LocalDateTime.now();
        
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
                        .actionUrl("/manager/tasks/" + revisionRequest.getContractId() + "/" + assignmentId)
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
        
        LocalDateTime now = LocalDateTime.now();
        
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
        
        // Update milestone work status: WAITING_CUSTOMER → READY_FOR_PAYMENT hoặc COMPLETED
        if (revisionRequest.getMilestoneId() != null && revisionRequest.getContractId() != null) {
            ContractMilestone milestone = contractMilestoneRepository
                    .findByMilestoneIdAndContractId(revisionRequest.getMilestoneId(), revisionRequest.getContractId())
                    .orElse(null);
            if (milestone != null && milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_CUSTOMER) {
                // Kiểm tra xem milestone có payment (installment) không
                // Nếu không có payment → set COMPLETED luôn
                // Nếu có payment → set READY_FOR_PAYMENT
                Optional<ContractInstallment> installmentOpt = contractInstallmentRepository
                        .findByContractIdAndMilestoneId(revisionRequest.getContractId(), milestone.getMilestoneId());
                boolean hasPayment = installmentOpt.isPresent();
                
                if (hasPayment) {
                    milestone.setWorkStatus(MilestoneWorkStatus.READY_FOR_PAYMENT);
                    milestone.setFinalCompletedAt(now);
                    contractMilestoneRepository.save(milestone);
                    log.info("Tracked final completion time for milestone: milestoneId={}, finalCompletedAt={}, workStatus=READY_FOR_PAYMENT", 
                            milestone.getMilestoneId(), milestone.getFinalCompletedAt());
                    log.info("Milestone work status updated to READY_FOR_PAYMENT after customer accepted revision: milestoneId={}, contractId={}", 
                            milestone.getMilestoneId(), revisionRequest.getContractId());
                    
                    // Mở installment DUE cho milestone khi milestone chuyển sang READY_FOR_PAYMENT
                    try {
                        contractService.openInstallmentForMilestoneIfReady(milestone.getMilestoneId());
                        log.info("Opened installment DUE for milestone: milestoneId={}", milestone.getMilestoneId());
                    } catch (Exception e) {
                        // Log error nhưng không fail transaction
                        log.error("Failed to open installment for milestone: milestoneId={}, error={}",
                                milestone.getMilestoneId(), e.getMessage(), e);
                    }
                } else {
                    milestone.setWorkStatus(MilestoneWorkStatus.COMPLETED);
                    milestone.setFinalCompletedAt(now);
                    contractMilestoneRepository.save(milestone);
                    log.info("Tracked final completion time for milestone (no payment): milestoneId={}, finalCompletedAt={}, workStatus=COMPLETED", 
                            milestone.getMilestoneId(), milestone.getFinalCompletedAt());
                    log.info("Milestone work status updated to COMPLETED after customer accepted revision (no payment): milestoneId={}, contractId={}", 
                            milestone.getMilestoneId(), revisionRequest.getContractId());
                    
                    // Unlock milestone tiếp theo khi milestone này được hoàn thành (không có payment)
                    if (milestone.getOrderIndex() != null) {
                        contractService.unlockNextMilestone(revisionRequest.getContractId(), milestone.getOrderIndex());
                    }
                }
            }
        }
        
        // Update revised submission status to customer_accepted
        if (revisionRequest.getRevisedSubmissionId() != null) {
            try {
                FileSubmission revisedSubmission = fileSubmissionRepository.findById(revisionRequest.getRevisedSubmissionId())
                        .orElse(null);
                if (revisedSubmission != null) {
                    revisedSubmission.setStatus(SubmissionStatus.customer_accepted);
                    fileSubmissionRepository.save(revisedSubmission);
                    log.info("Revised submission status updated to customer_accepted: submissionId={}, revisionRequestId={}", 
                            revisionRequest.getRevisedSubmissionId(), revisionRequest.getRevisionRequestId());
                } else {
                    log.warn("Revised submission not found: submissionId={}, revisionRequestId={}", 
                            revisionRequest.getRevisedSubmissionId(), revisionRequest.getRevisionRequestId());
                }
            } catch (Exception e) {
                log.error("Failed to update revised submission status: submissionId={}, revisionRequestId={}, error={}", 
                        revisionRequest.getRevisedSubmissionId(), revisionRequest.getRevisionRequestId(), e.getMessage(), e);
            }
        }
        
        log.info("Customer accepted revision: revisionRequestId={}, assignmentId={}", 
                revisionRequest.getRevisionRequestId(), assignmentId);
    }
    
    /**
     * Update revision request khi customer reject và tạo revision request mới (gọi từ customerReviewSubmission hoặc event consumer)
     * @param submissionId ID của submission (cần khi không có revision cũ)
     * @param contractId ID của contract (cần khi không có revision cũ)
     * @param milestoneId ID của milestone (cần khi không có revision cũ)
     * @param paidWalletTxId ID của wallet transaction nếu là paid revision (null nếu free)
     * @return RevisionRequestResponse của revision request mới được tạo
     */
    @Transactional
    public RevisionRequestResponse updateRevisionRequestOnCustomerReject(
            String assignmentId, 
            String userId,
            String title,
            String description,
            String submissionId,
            String contractId,
            String milestoneId,
            String paidWalletTxId) {
        
        List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                assignmentId, RevisionRequestStatus.WAITING_CUSTOMER_CONFIRM);
        
        if (activeRevisions.isEmpty()) {
            // Không có revision request đang chờ → tạo revision request mới trực tiếp
            return createRevisionRequestInternal(
                    submissionId,
                    title,
                    description,
                    userId,
                    contractId,
                    milestoneId,
                    assignmentId,
                    paidWalletTxId);
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
        
        LocalDateTime now = LocalDateTime.now();
        
        // Customer request revision mới → mark revision request cũ (WAITING_CUSTOMER_CONFIRM) as COMPLETED
        // (đánh dấu đã xử lý xong vòng revision đó, customer không accept và request revision mới)
        revisionRequest.setStatus(RevisionRequestStatus.COMPLETED);
        revisionRequestRepository.save(revisionRequest);
            
            // Create new revision request for next round
        Integer nextRound = revisionRequestRepository.findNextRevisionRound(assignmentId);
        
        // Get contract to get managerId and check free revisions
        Contract contract = contractRepository.findById(revisionRequest.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(revisionRequest.getContractId()));
        
        // Đếm số revision requests đã có isFreeRevision = true và KHÔNG bị REJECTED cho contract này
        // Đếm tất cả revision free (kể cả đang pending, in_revision, waiting_customer_confirm, completed)
        // CHỈ loại trừ REJECTED (vì revision bị reject không được tính là đã sử dụng lượt free)
        long freeRevisionsUsed = revisionRequestRepository.findByContractId(revisionRequest.getContractId()).stream()
                .filter(rr -> Boolean.TRUE.equals(rr.getIsFreeRevision()) 
                        && rr.getStatus() != RevisionRequestStatus.REJECTED
                        && rr.getStatus() != RevisionRequestStatus.CANCELED)
                .count();
        
        boolean isFreeRevision = paidWalletTxId == null && freeRevisionsUsed < contract.getFreeRevisionsIncluded();
        
        // Validate: nếu có paidWalletTxId thì phải là paid revision
        if (paidWalletTxId != null && isFreeRevision) {
            log.warn("paidWalletTxId provided but revision should be free: contractId={}, freeRevisionsUsed={}, freeRevisionsIncluded={}", 
                    revisionRequest.getContractId(), freeRevisionsUsed, contract.getFreeRevisionsIncluded());
            // Vẫn tạo như paid revision vì đã có transaction
            isFreeRevision = false;
        }
            
        RevisionRequest newRevisionRequest = RevisionRequest.builder()
                .contractId(revisionRequest.getContractId())
                .milestoneId(revisionRequest.getMilestoneId())
                .taskAssignmentId(assignmentId)
                .originalSubmissionId(submissionId)  // Track submission ban đầu mà customer request revision
                .customerId(userId)
                .managerId(contract.getManagerUserId())  // Set managerId ngay từ đầu
                .title(title)
                .description(description)
                .revisionRound(nextRound)
                .isFreeRevision(isFreeRevision)  // Tính toán dựa trên số free revisions đã dùng
                .paidWalletTxId(paidWalletTxId)  // Set nếu là paid revision
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
        
        return toResponse(saved);
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
     * Batch get revision requests by multiple assignment IDs with pre-loaded contract (optimized)
     * Sử dụng contract đã load để tránh query lại
     * 
     * @param assignmentIds List of assignment IDs
     * @param contractId Contract ID (for permission verification)
     * @param userId User ID
     * @param userRoles User roles
     * @param contract Contract đã được load trước đó
     * @return List of revision request responses
     */
    public List<RevisionRequestResponse> getRevisionRequestsByAssignmentIdsWithContract(
            List<String> assignmentIds,
            String contractId,
            String userId,
            List<String> userRoles,
            Contract contract) {
        
        if (assignmentIds == null || assignmentIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        
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
        
        // Sử dụng contract đã được load thay vì query lại
        // Tất cả revision requests đều thuộc cùng contractId (đã verify ở đầu method)
        Map<String, Contract> contractsMap = new HashMap<>();
        contractsMap.put(contractId, contract); // Sử dụng contract đã load, không query lại
        
        // Map với contract đã có sẵn
        List<RevisionRequestResponse> responses = revisionRequests.stream()
                .map(rr -> {
                    // Tất cả revision requests đều thuộc cùng contractId
                    Contract contractForRR = contractsMap.get(rr.getContractId());
                    return toResponseWithContract(rr, contractForRR);
                })
                .collect(Collectors.toList());
        
        return responses;
    }

    /**
     * Get revision statistics for a contract (free/paid revisions used)
     * Customer chỉ được xem stats của contract của mình
     */
    @Transactional(readOnly = true)
    public ContractRevisionStatsResponse getContractRevisionStats(
            String contractId,
            String userId,
            List<String> userRoles) {
        log.info("Getting revision stats for contract: {}, userId: {}", contractId, userId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        // Customer chỉ được xem stats của contract của mình
        if (userRoles.contains("CUSTOMER") && !contract.getUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only view revision stats from your own contracts");
        }
        
        // Manager có thể xem stats của contract mình quản lý
        if ((userRoles.contains("MANAGER") || userRoles.contains("SYSTEM_ADMIN"))
                && !contract.getManagerUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only view revision stats from contracts you manage");
        }
        
        // Load tất cả revision requests của contract
        List<RevisionRequest> allRevisionRequests = revisionRequestRepository.findByContractId(contractId);
        
        // Đếm free revisions đã sử dụng (không tính REJECTED/CANCELED)
        int freeRevisionsUsed = (int) allRevisionRequests.stream()
                .filter(rr -> Boolean.TRUE.equals(rr.getIsFreeRevision())
                        && rr.getStatus() != RevisionRequestStatus.REJECTED
                        && rr.getStatus() != RevisionRequestStatus.CANCELED)
                .count();
        
        // Giới hạn free revisions used không vượt quá freeRevisionsIncluded
        Integer freeRevisionsIncluded = contract.getFreeRevisionsIncluded();
        if (freeRevisionsIncluded != null) {
            freeRevisionsUsed = Math.min(freeRevisionsUsed, freeRevisionsIncluded);
        }
        
        // Đếm paid revisions đã sử dụng (không tính REJECTED/CANCELED)
        int paidRevisionsUsed = (int) allRevisionRequests.stream()
                .filter(rr -> Boolean.FALSE.equals(rr.getIsFreeRevision())
                        && rr.getStatus() != RevisionRequestStatus.REJECTED
                        && rr.getStatus() != RevisionRequestStatus.CANCELED)
                .count();
        
        int totalRevisionsUsed = freeRevisionsUsed + paidRevisionsUsed;
        
        // Tính số lượt free còn lại
        Integer freeRevisionsRemaining = null;
        if (freeRevisionsIncluded != null) {
            freeRevisionsRemaining = Math.max(0, freeRevisionsIncluded - freeRevisionsUsed);
        }
        
        return ContractRevisionStatsResponse.builder()
                .contractId(contractId)
                .freeRevisionsIncluded(freeRevisionsIncluded)
                .freeRevisionsUsed(freeRevisionsUsed)
                .paidRevisionsUsed(paidRevisionsUsed)
                .totalRevisionsUsed(totalRevisionsUsed)
                .freeRevisionsRemaining(freeRevisionsRemaining)
                .build();
    }

    /**
     * Convert entity to response DTO
     */
    private RevisionRequestResponse toResponse(RevisionRequest revisionRequest) {
        // Get contract để lấy revisionDeadlineDays (fallback cho các trường hợp khác)
        Contract contract = contractRepository.findById(revisionRequest.getContractId()).orElse(null);
        return toResponseWithContract(revisionRequest, contract);
    }

    /**
     * Convert entity to response DTO with pre-loaded contract (optimized for batch loading)
     */
    private RevisionRequestResponse toResponseWithContract(RevisionRequest revisionRequest, Contract contract) {
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
                .createdAt(revisionRequest.getCreatedAt())
                .updatedAt(revisionRequest.getUpdatedAt())
                .createdBy(revisionRequest.getCreatedBy())
                .updatedBy(revisionRequest.getUpdatedBy())
                .build();
    }
}

