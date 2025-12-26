package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.dto.response.FileSubmissionResponse;
import com.mutrapro.project_service.dto.response.RevisionRequestResponse;
import com.mutrapro.project_service.dto.response.CustomerDeliveriesResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.entity.FileSubmission;
import com.mutrapro.project_service.entity.RevisionRequest;
import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.RevisionRequestStatus;
import com.mutrapro.project_service.enums.SubmissionStatus;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.exception.ContractMilestoneNotFoundException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.exception.FileNotBelongToAssignmentException;
import com.mutrapro.project_service.exception.FileSubmissionNotFoundException;
import com.mutrapro.project_service.exception.InvalidBookingStatusException;
import com.mutrapro.project_service.exception.InvalidFileStatusException;
import com.mutrapro.project_service.exception.InvalidSubmissionStatusException;
import com.mutrapro.project_service.exception.InvalidTaskAssignmentStatusException;
import com.mutrapro.project_service.exception.InvalidStateException;
import com.mutrapro.project_service.exception.NoFilesSelectedException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.ValidationException;
import com.mutrapro.project_service.mapper.FileSubmissionMapper;
import com.mutrapro.project_service.repository.ContractInstallmentRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.repository.FileSubmissionRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.RevisionRequestRepository;
import com.mutrapro.project_service.repository.StudioBookingRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.project_service.entity.ContractInstallment;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.shared.event.SubmissionDeliveredEvent;
import com.mutrapro.shared.event.SubmissionSubmittedEvent;
import com.mutrapro.shared.event.SubmissionRejectedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileSubmissionService {

    FileSubmissionRepository fileSubmissionRepository;
    FileRepository fileRepository;
    TaskAssignmentRepository taskAssignmentRepository;
    ContractRepository contractRepository;
    ContractMilestoneRepository contractMilestoneRepository;
    ContractInstallmentRepository contractInstallmentRepository;
    OutboxEventRepository outboxEventRepository;
    RevisionRequestService revisionRequestService;
    RevisionRequestRepository revisionRequestRepository;
    StudioBookingRepository studioBookingRepository;
    ContractService contractService;
    TaskAssignmentService taskAssignmentService;
    ObjectMapper objectMapper;
    FileSubmissionMapper fileSubmissionMapper;

    /**
     * Submit files for review - Backend tự động tạo submission, add files và submit
     * FE chỉ cần gọi với assignmentId và fileIds, backend sẽ tự động xử lý tất cả
     * 
     * @param assignmentId ID của task assignment
     * @param fileIds      Danh sách file IDs cần submit
     * @param userId       ID của specialist
     * @return FileSubmissionResponse
     */
    @Transactional
    public FileSubmissionResponse submitFilesForReview(
            String assignmentId,
            List<String> fileIds,
            String userId) {

        log.info("Submitting {} files for review: assignmentId={}, userId={}",
                fileIds != null ? fileIds.size() : 0, assignmentId, userId);

        // Validate fileIds
        if (fileIds == null || fileIds.isEmpty()) {
            throw NoFilesSelectedException.forSubmission();
        }

        // Verify assignment exists and belongs to specialist
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));

        // Verify assignment belongs to current specialist
        // So sánh với specialistUserIdSnapshot (userId/email) chứ không phải
        // specialistId (UUID)
        String specialistUserId = assignment.getSpecialistUserIdSnapshot();
        if (specialistUserId == null || !specialistUserId.equals(userId)) {
            throw UnauthorizedException.create("You can only submit files for your own tasks");
        }

        // Only allow submit if task is in_progress, revision_requested (manager
        // revision), or in_revision (customer revision)
        if (assignment.getStatus() != AssignmentStatus.in_progress
                && assignment.getStatus() != AssignmentStatus.revision_requested
                && assignment.getStatus() != AssignmentStatus.in_revision) {
            throw InvalidTaskAssignmentStatusException.cannotSubmitForReview(
                    assignment.getAssignmentId(),
                    assignment.getStatus());
        }

        // Validate contract status - chỉ cho phép submit file nếu contract đã active
        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));
        
        if (contract.getStatus() != ContractStatus.active) {
            throw InvalidContractStatusException.cannotUpdate(
                assignment.getContractId(),
                contract.getStatus(),
                String.format("Cannot submit files. Contract must be in 'active' status, but current status is: %s. Please wait for manager to start contract work.", 
                    contract.getStatus())
            );
        }

        // Get files và validate
        List<File> filesToSubmit = fileRepository.findByFileIdIn(fileIds);

        if (filesToSubmit.isEmpty()) {
            throw NoFilesSelectedException.notFound();
        }

        // Validate files
        for (File file : filesToSubmit) {
            // Validate: file phải thuộc assignmentId
            if (!assignmentId.equals(file.getAssignmentId())) {
                throw FileNotBelongToAssignmentException.create(file.getFileId(), assignmentId);
            }

            // Validate: fileStatus phải là uploaded
            if (file.getFileStatus() != FileStatus.uploaded) {
                throw InvalidFileStatusException.cannotSubmit(file.getFileId(), file.getFileStatus());
            }
        }

        // Validate booking status for recording_supervision task before submitting
        // (Đảm bảo booking không bị CANCELLED sau khi upload file)
        if (assignment.getTaskType() == TaskType.recording_supervision 
                && assignment.getStudioBookingId() != null) {
            studioBookingRepository.findByBookingId(assignment.getStudioBookingId())
                    .ifPresent(booking -> {
                        BookingStatus bookingStatus = booking.getStatus();
                        // Không cho phép submit nếu booking đã bị CANCELLED hoặc NO_SHOW
                        if (bookingStatus == BookingStatus.CANCELLED 
                                || bookingStatus == BookingStatus.NO_SHOW) {
                            throw InvalidBookingStatusException.cannotSubmitFiles(
                                booking.getBookingId(), bookingStatus);
                        }
                    });
        }

        // 1. Tự động tạo submission package
        Integer nextVersion = getNextVersion(assignmentId);

        FileSubmission submission = FileSubmission.builder()
                .assignmentId(assignmentId)
                .submissionName(String.format("Submission v%d", nextVersion))
                .status(SubmissionStatus.draft)
                .createdBy(userId)
                .createdAt(LocalDateTime.now())
                .version(nextVersion)
                .build();

        FileSubmission savedSubmission = fileSubmissionRepository.save(submission);
        log.info("Auto-created submission: submissionId={}, assignmentId={}, version={}",
                savedSubmission.getSubmissionId(), assignmentId, nextVersion);

        // 2. Add files vào submission và update status trong 1 lần
        String submissionId = savedSubmission.getSubmissionId();
        filesToSubmit.forEach(file -> {
            file.setSubmissionId(submissionId);
            file.setFileStatus(FileStatus.pending_review);
        });
        fileRepository.saveAll(filesToSubmit);
        log.info("Added {} files to submission and updated status: submissionId={}", filesToSubmit.size(),
                submissionId);

        // 3. Tự động submit submission for review
        savedSubmission.setStatus(SubmissionStatus.pending_review);
        savedSubmission.setSubmittedAt(LocalDateTime.now());
        FileSubmission submittedSubmission = fileSubmissionRepository.save(savedSubmission);

        // Lưu status trước khi update để check
        AssignmentStatus previousStatus = assignment.getStatus();

        // Update assignment status to ready_for_review
        assignment.setStatus(AssignmentStatus.ready_for_review);
        taskAssignmentRepository.save(assignment);
        
        // Update progress percentage cho assignment
        try {
            taskAssignmentService.updateProgressForAssignment(assignmentId);
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.warn("Failed to update progress for assignment: assignmentId={}, error={}", 
                assignmentId, e.getMessage());
        }

        // Chỉ update revision request nếu assignment đang ở trạng thái in_revision
        // (customer revision)
        // hoặc revision_requested (manager reject revision, specialist submit lại)
        // Không cần update nếu là in_progress (submit lần đầu)
        // autoUpdateRevisionRequestOnFileSubmit() sẽ tự check và return nếu không có
        // revision request IN_REVISION
        boolean isFirstSubmission = (previousStatus == AssignmentStatus.in_progress);
        if (previousStatus == AssignmentStatus.in_revision || previousStatus == AssignmentStatus.revision_requested) {
            try {
                revisionRequestService.autoUpdateRevisionRequestOnFileSubmit(assignmentId, submissionId, userId);
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.warn(
                        "Failed to auto-update revision request on file submit: assignmentId={}, submissionId={}, error={}",
                        assignmentId, submissionId, e.getMessage());
            }
        }
        
        // Gửi event thông báo manager khi specialist submit file lần đầu (không phải revision)
        if (isFirstSubmission) {
            try {
                
                ContractMilestone milestone = null;
                String milestoneName = "milestone";
                if (assignment.getMilestoneId() != null && assignment.getContractId() != null) {
                    milestone = contractMilestoneRepository
                            .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                            .orElse(null);
                    if (milestone != null && milestone.getName() != null) {
                        milestoneName = milestone.getName();
                    }
                }
                
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                        ? contract.getContractNumber()
                        : contract.getContractId();
                
                SubmissionSubmittedEvent event = SubmissionSubmittedEvent.builder()
                        .eventId(java.util.UUID.randomUUID())
                        .submissionId(submissionId)
                        .submissionName(submittedSubmission.getSubmissionName())
                        .taskAssignmentId(assignmentId)
                        .milestoneId(assignment.getMilestoneId())
                        .milestoneName(milestoneName)
                        .contractId(assignment.getContractId())
                        .contractNumber(contractLabel)
                        .specialistId(assignment.getSpecialistId())
                        .specialistUserId(assignment.getSpecialistUserIdSnapshot())
                        .managerUserId(contract.getManagerUserId())
                        .taskType(assignment.getTaskType() != null ? assignment.getTaskType().toString() : null)
                        .fileCount(filesToSubmit.size())
                        .title("File đã được submit - cần review")
                        .content(String.format(
                                "Specialist đã submit file cho task \"%s\" của milestone \"%s\" trong contract #%s. Vui lòng xem xét và duyệt.",
                                assignment.getTaskType() != null ? assignment.getTaskType().toString() : "task",
                                milestoneName,
                                contractLabel))
                        .referenceType("SUBMISSION")
                        .actionUrl("/manager/tasks/" + assignment.getContractId() + "/" + assignmentId)
                        .submittedAt(submittedSubmission.getSubmittedAt())
                        .timestamp(LocalDateTime.now())
                        .build();
                
                JsonNode payload = objectMapper.valueToTree(event);
                java.util.UUID aggregateId;
                try {
                    aggregateId = java.util.UUID.fromString(submissionId);
                } catch (IllegalArgumentException ex) {
                    aggregateId = java.util.UUID.randomUUID();
                }
                
                OutboxEvent outboxEvent = OutboxEvent.builder()
                        .aggregateId(aggregateId)
                        .aggregateType("Submission")
                        .eventType("submission.submitted")
                        .eventPayload(payload)
                        .build();
                
                outboxEventRepository.save(outboxEvent);
                log.info(
                        "Queued SubmissionSubmittedEvent in outbox: eventId={}, submissionId={}, assignmentId={}, managerUserId={}",
                        event.getEventId(), submissionId, assignmentId, contract.getManagerUserId());
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue SubmissionSubmittedEvent: submissionId={}, assignmentId={}, error={}",
                        submissionId, assignmentId, e.getMessage(), e);
            }
        }

        // Update studio booking status to COMPLETED when recording_supervision task submits files for review
        // (Recording session đã hoàn thành và file đã được upload)
        if (assignment.getTaskType() == TaskType.recording_supervision 
                && assignment.getStudioBookingId() != null) {
            try {
                studioBookingRepository.findByBookingId(assignment.getStudioBookingId())
                        .ifPresent(booking -> {
                            // Chỉ update nếu booking đang ở IN_PROGRESS hoặc CONFIRMED
                            // (Không update nếu đã COMPLETED hoặc CANCELLED)
                            if (booking.getStatus() == BookingStatus.IN_PROGRESS 
                                    || booking.getStatus() == BookingStatus.CONFIRMED) {
                                booking.setStatus(BookingStatus.COMPLETED);
                                studioBookingRepository.save(booking);
                                log.info("Studio booking status updated to COMPLETED after file submission: bookingId={}, assignmentId={}",
                                        booking.getBookingId(), assignmentId);
                            }
                        });
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.warn("Failed to update studio booking status on file submit: assignmentId={}, bookingId={}, error={}",
                        assignmentId, assignment.getStudioBookingId(), e.getMessage());
            }
        }

        log.info("Auto-submitted submission: submissionId={}, fileCount={}, assignmentId={}",
                submittedSubmission.getSubmissionId(), filesToSubmit.size(), assignmentId);

        return toResponse(submittedSubmission);
    }

    /**
     * Lấy submission theo ID
     */
    public FileSubmissionResponse getSubmission(String submissionId, String userId, List<String> userRoles) {
        FileSubmission submission = fileSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> FileSubmissionNotFoundException.byId(submissionId));

        // Verify access - check if user is specialist or manager
        TaskAssignment assignment = taskAssignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(submission.getAssignmentId()));

        boolean hasAccess = false;

        // Check specialist access - so sánh với specialistUserIdSnapshot (userId/email)
        String specialistUserId = assignment.getSpecialistUserIdSnapshot();
        if (specialistUserId != null && specialistUserId.equals(userId)) {
            hasAccess = true;
        }

        // Check manager access
        if (!hasAccess && (userRoles.contains("MANAGER") || userRoles.contains("SYSTEM_ADMIN"))) {
            Contract contract = contractRepository.findById(assignment.getContractId()).orElse(null);
            if (contract != null && contract.getManagerUserId().equals(userId)) {
                hasAccess = true;
            }
        }

        if (!hasAccess) {
            throw UnauthorizedException.create("You don't have access to this submission");
        }

        return toResponse(submission);
    }

    /**
     * Lấy danh sách submissions theo assignmentId
     * Chỉ dành cho specialist và manager
     */
    public List<FileSubmissionResponse> getSubmissionsByAssignmentId(String assignmentId, String userId,
            List<String> userRoles) {
        // Verify assignment access first
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));

        // Check specialist access - so sánh với specialistUserIdSnapshot (userId/email)
        String specialistUserId = assignment.getSpecialistUserIdSnapshot();
        boolean hasAccess = specialistUserId != null && specialistUserId.equals(userId);

        // Check manager access
        if (!hasAccess && (userRoles.contains("MANAGER") || userRoles.contains("SYSTEM_ADMIN"))) {
            Contract contract = contractRepository.findById(assignment.getContractId()).orElse(null);
            if (contract != null && contract.getManagerUserId().equals(userId)) {
                hasAccess = true;
            }
        }

        if (!hasAccess) {
            throw UnauthorizedException.create("You don't have access to this assignment");
        }

        List<FileSubmission> submissions = fileSubmissionRepository.findByAssignmentId(assignmentId);
        return submissions.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Customer lấy danh sách delivered submissions theo milestone
     * Chỉ dành cho customer, sử dụng JPA query riêng query trực tiếp từ milestone
     * Trả về thông tin contract, milestone và submissions
     */
    public CustomerDeliveriesResponse getDeliveredSubmissionsByMilestoneForCustomer(
            String milestoneId,
            String contractId,
            String userId,
            List<String> userRoles) {

        // Step 1: Load contract & milestone
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));

        // Customer chỉ được xem submissions của contract của mình
        if (userRoles.contains("CUSTOMER") && !contract.getUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only view submissions from your own contracts");
        }

        // Manager có thể xem submissions của contract mình quản lý
        if ((userRoles.contains("MANAGER") || userRoles.contains("SYSTEM_ADMIN"))
                && !contract.getManagerUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only view submissions from contracts you manage");
        }

        // Verify milestone belongs to contract and get milestone
        ContractMilestone milestone = contractMilestoneRepository
                .findByMilestoneIdAndContractId(milestoneId, contractId)
                .orElseThrow(() -> ContractMilestoneNotFoundException.byId(milestoneId, contractId));

        // Step 2: Load submissions
        List<FileSubmission> deliveredSubmissions = fileSubmissionRepository
                .findDeliveredSubmissionsByMilestoneAndContract(
                        milestoneId,
                        contractId,
                        SubmissionStatus.delivered);

        // Build response với contract, milestone và submissions
        CustomerDeliveriesResponse.ContractInfo contractInfo = CustomerDeliveriesResponse.ContractInfo.builder()
                .contractId(contract.getContractId())
                .contractNumber(contract.getContractNumber())
                .contractType(contract.getContractType() != null ? contract.getContractType().toString() : null)
                .requestId(contract.getRequestId()) // Thêm requestId để frontend có thể lazy load request info
                .freeRevisionsIncluded(contract.getFreeRevisionsIncluded()) // Số lần revision free
                .additionalRevisionFeeVnd(contract.getAdditionalRevisionFeeVnd()) // Phí revision bổ sung
                .revisionDeadlineDays(contract.getRevisionDeadlineDays()) // Số ngày SLA để hoàn thành revision
                .build();

        // Load installment để lấy status (để check xem đã thanh toán chưa)
        String installmentStatus = null;
        Optional<ContractInstallment> installmentOpt = contractInstallmentRepository
                .findByContractIdAndMilestoneId(contractId, milestoneId);
        if (installmentOpt.isPresent()) {
            installmentStatus = installmentOpt.get().getStatus() != null 
                    ? installmentOpt.get().getStatus().toString() 
                    : null;
        }

        // Compute targetDeadline + SLA status for customer UI
        LocalDateTime targetDeadline = null;
        Boolean firstSubmissionLate = null;
        Boolean overdueNow = null;
        try {
            List<ContractMilestone> allMilestones = contractMilestoneRepository
                    .findByContractIdOrderByOrderIndexAsc(contractId);
            targetDeadline = resolveMilestoneTargetDeadlineForCustomer(milestone, contract, allMilestones);
            if (targetDeadline != null) {
                if (milestone.getFirstSubmissionAt() != null) {
                    firstSubmissionLate = milestone.getFirstSubmissionAt().isAfter(targetDeadline);
                    overdueNow = false;
                } else {
                    overdueNow = LocalDateTime.now().isAfter(targetDeadline);
                }
            }
        } catch (Exception ignored) {
            // keep computed fields null
        }

        CustomerDeliveriesResponse.MilestoneInfo milestoneInfo = CustomerDeliveriesResponse.MilestoneInfo.builder()
                .milestoneId(milestone.getMilestoneId())
                .name(milestone.getName())
                .description(milestone.getDescription())
                .milestoneType(milestone.getMilestoneType() != null ? milestone.getMilestoneType().toString() : null)
                .workStatus(milestone.getWorkStatus() != null ? milestone.getWorkStatus().toString() : null)
                .plannedDueDate(milestone.getPlannedDueDate())
                .targetDeadline(targetDeadline)
                .firstSubmissionAt(milestone.getFirstSubmissionAt())
                .firstSubmissionLate(firstSubmissionLate)
                .overdueNow(overdueNow)
                .actualStartAt(milestone.getActualStartAt())
                .finalCompletedAt(milestone.getFinalCompletedAt())  // Thời điểm customer chấp nhận bản cuối cùng
                .actualEndAt(milestone.getActualEndAt())  // Thời điểm milestone được thanh toán
                .installmentStatus(installmentStatus)
                .build();

        // Step 3: Batch load files cho tất cả submissions trước (tránh N+1 problem)
        List<String> submissionIds = deliveredSubmissions.stream()
                .map(FileSubmission::getSubmissionId)
                .collect(Collectors.toList());
        
        List<File> allFiles = submissionIds.isEmpty() 
                ? Collections.emptyList() 
                : fileRepository.findBySubmissionIdIn(submissionIds);
        
        // Group files by submissionId để map nhanh hơn
        Map<String, List<File>> filesBySubmissionId = allFiles.stream()
                .collect(Collectors.groupingBy(File::getSubmissionId));
        
        // Map submissions với files đã được batch load
        List<FileSubmissionResponse> submissionResponses = deliveredSubmissions.stream()
                .map(submission -> {
                    List<File> files = filesBySubmissionId.getOrDefault(
                            submission.getSubmissionId(), 
                            java.util.Collections.emptyList());
                    return toResponseWithFiles(submission, files);
                })
                .collect(Collectors.toList());

        // Step 4: Load revision requests cho tất cả assignments trong milestone này
        // Lấy unique assignmentIds từ submissions
        List<String> assignmentIds = deliveredSubmissions.stream()
                .map(FileSubmission::getAssignmentId)
                .distinct()
                .collect(Collectors.toList());

        // Batch load revision requests (1 query thay vì N queries)
        // Truyền contract đã load để tránh query lại
        List<RevisionRequestResponse> revisionRequests;
        try {
            revisionRequests = revisionRequestService.getRevisionRequestsByAssignmentIdsWithContract(
                    assignmentIds,
                    contractId,
                    userId,
                    userRoles,
                    contract); // Truyền contract đã load ở Step 1a
        } catch (Exception e) {
            log.warn("Failed to batch load revision requests: {}", e.getMessage());
            revisionRequests = java.util.Collections.emptyList();
        }

        return CustomerDeliveriesResponse.builder()
                .contract(contractInfo)  // contractInfo đã có requestId để frontend lazy load
                .milestone(milestoneInfo)
                .submissions(submissionResponses)
                .revisionRequests(revisionRequests)
                .build();
    }

    private LocalDateTime resolveMilestoneTargetDeadlineForCustomer(
            ContractMilestone milestone,
            Contract contract,
            List<ContractMilestone> allContractMilestones) {
        if (milestone == null) {
            return null;
        }
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (slaDays == null || slaDays <= 0) {
            return null;
        }

        // Recording milestone: special rules
        if (milestone.getMilestoneType() == MilestoneType.recording) {
            if (contract != null && contract.getContractType() == ContractType.arrangement_with_recording) {
                // Workflow 3: hard deadline = last arrangement actualEndAt (paid) + SLA (ignore booking)
                List<ContractMilestone> all = allContractMilestones != null
                        ? allContractMilestones
                        : contractMilestoneRepository.findByContractIdOrderByOrderIndexAsc(milestone.getContractId());
                ContractMilestone lastArrangement = all.stream()
                        .filter(m -> m.getMilestoneType() == MilestoneType.arrangement)
                        .max(Comparator.comparing(ContractMilestone::getOrderIndex))
                        .orElse(null);
                if (lastArrangement != null && lastArrangement.getActualEndAt() != null) {
                    return lastArrangement.getActualEndAt().plusDays(slaDays);
                }
                // If arrangement not paid yet => fallback planned
            } else if (contract != null && contract.getContractType() == ContractType.recording) {
                // Workflow 4: booking date (+ startTime) + SLA
                Optional<StudioBooking> bookingOpt = studioBookingRepository.findByMilestoneId(milestone.getMilestoneId());
                if (bookingOpt.isPresent()) {
                    StudioBooking booking = bookingOpt.get();
                    List<BookingStatus> activeStatuses = List.of(
                            BookingStatus.TENTATIVE, BookingStatus.PENDING,
                            BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
                    if (activeStatuses.contains(booking.getStatus()) && booking.getBookingDate() != null) {
                        LocalTime startTime = booking.getStartTime() != null ? booking.getStartTime() : LocalTime.of(8, 0);
                        LocalDateTime startAt = booking.getBookingDate().atTime(startTime);
                        return startAt.plusDays(slaDays);
                    }
                }
            }

            // Fallback for recording: planned dates (baseline)
            if (milestone.getPlannedDueDate() != null) {
                return milestone.getPlannedDueDate();
            }
            if (milestone.getPlannedStartAt() != null) {
                return milestone.getPlannedStartAt().plusDays(slaDays);
            }
            return null;
        }

        // Other milestones: target deadline is based on actualStartAt (once started), otherwise planned
        if (milestone.getActualStartAt() != null) {
            return milestone.getActualStartAt().plusDays(slaDays);
        }
        if (milestone.getPlannedDueDate() != null) {
            return milestone.getPlannedDueDate();
        }
        if (milestone.getPlannedStartAt() != null) {
            return milestone.getPlannedStartAt().plusDays(slaDays);
        }
        return null;
    }

    /**
     * Manager approve submission
     */
    @Transactional
    public FileSubmissionResponse approveSubmission(String submissionId, String userId, List<String> userRoles) {
        log.info("Manager {} approving submission: {}", userId, submissionId);

        // Verify user is MANAGER
        if (!userRoles.contains("MANAGER") && !userRoles.contains("SYSTEM_ADMIN")) {
            throw UnauthorizedException.create("Only managers can approve submissions");
        }

        FileSubmission submission = fileSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> FileSubmissionNotFoundException.byId(submissionId));

        // Verify manager has access to assignment
        TaskAssignment assignment = taskAssignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(submission.getAssignmentId()));

        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));

        if (!contract.getManagerUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only approve submissions from your contracts");
        }

        // Only allow approve if status is pending_review
        if (submission.getStatus() != SubmissionStatus.pending_review) {
            throw InvalidSubmissionStatusException.cannotApprove(submissionId, submission.getStatus());
        }

        // Update submission status
        submission.setStatus(SubmissionStatus.approved);
        submission.setReviewedBy(userId);
        submission.setReviewedAt(LocalDateTime.now());
        FileSubmission saved = fileSubmissionRepository.save(submission);

        // Update all files to approved
        List<File> files = fileRepository.findBySubmissionId(submissionId);
        files.forEach(file -> {
            file.setFileStatus(FileStatus.approved);
            file.setReviewedBy(userId);
            file.setReviewedAt(LocalDateTime.now());
        });
        fileRepository.saveAll(files);

        // Update task assignment status to delivery_pending
        if (assignment.getStatus() != AssignmentStatus.delivery_pending &&
                assignment.getStatus() != AssignmentStatus.completed) {
            assignment.setStatus(AssignmentStatus.delivery_pending);
            taskAssignmentRepository.save(assignment);
            log.info("Task assignment marked as delivery_pending: assignmentId={}", assignment.getAssignmentId());
        }

        // Nếu có revision request đang WAITING_MANAGER_REVIEW, update status thành
        // APPROVED_PENDING_DELIVERY
        // (Manager đã approve nhưng chưa deliver)
        // Tìm một lần và pass vào method để tránh query lại
        try {
            List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                    assignment.getAssignmentId(), RevisionRequestStatus.WAITING_MANAGER_REVIEW);

            if (!activeRevisions.isEmpty()) {
                revisionRequestService.updateRevisionRequestOnApproval(activeRevisions.get(0), userId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.warn("Failed to update revision request on approval: assignmentId={}, error={}",
                    assignment.getAssignmentId(), e.getMessage());
        }

        log.info("Approved submission: submissionId={}, fileCount={}", submissionId, files.size());
        
        // Update progress percentage cho assignment
        try {
            taskAssignmentService.updateProgressForAssignment(assignment.getAssignmentId());
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.warn("Failed to update progress for assignment: assignmentId={}, error={}", 
                assignment.getAssignmentId(), e.getMessage());
        }

        return toResponse(saved);
    }

    /**
     * Manager reject submission
     */
    @Transactional
    public FileSubmissionResponse rejectSubmission(
            String submissionId,
            String reason,
            String userId,
            List<String> userRoles) {

        log.info("Manager {} rejecting submission: {}, reason: {}", userId, submissionId, reason);

        // Verify user is MANAGER
        if (!userRoles.contains("MANAGER") && !userRoles.contains("SYSTEM_ADMIN")) {
            throw UnauthorizedException.create("Only managers can reject submissions");
        }

        FileSubmission submission = fileSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> FileSubmissionNotFoundException.byId(submissionId));

        // Verify manager has access to assignment
        TaskAssignment assignment = taskAssignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(submission.getAssignmentId()));

        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));

        if (!contract.getManagerUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only reject submissions from your contracts");
        }

        // Only allow reject if status is pending_review
        if (submission.getStatus() != SubmissionStatus.pending_review) {
            throw InvalidSubmissionStatusException.cannotReject(submissionId, submission.getStatus());
        }

        // Update submission status
        submission.setStatus(SubmissionStatus.rejected);
        submission.setReviewedBy(userId);
        submission.setReviewedAt(LocalDateTime.now());
        submission.setRejectionReason(reason);
        FileSubmission saved = fileSubmissionRepository.save(submission);

        // Update all files to rejected
        List<File> files = fileRepository.findBySubmissionId(submissionId);
        files.forEach(file -> {
            file.setFileStatus(FileStatus.rejected);
            file.setReviewedBy(userId);
            file.setReviewedAt(LocalDateTime.now());
            file.setRejectionReason(reason);
        });
        fileRepository.saveAll(files);

        // Check xem có revision request đang WAITING_MANAGER_REVIEW không
        // Nếu có → đây là revision flow, assignment status sẽ được update trong
        // updateRevisionRequestOnRejection()
        // Nếu không → đây là flow bình thường, update assignment status về
        // revision_requested
        boolean hasActiveRevisionRequest = false;
        try {
            hasActiveRevisionRequest = revisionRequestService.hasActiveRevisionRequest(
                    assignment.getAssignmentId(), RevisionRequestStatus.WAITING_MANAGER_REVIEW);
        } catch (Exception e) {
            log.warn("Failed to check revision requests for assignment: {}, error={}",
                    assignment.getAssignmentId(), e.getMessage());
        }

        // Nếu có revision request đang WAITING_MANAGER_REVIEW, update status về
        // IN_REVISION
        // (assignment status sẽ được update trong updateRevisionRequestOnRejection())
        // Nếu không có revision request, update assignment status về revision_requested
        // (flow bình thường)
        if (!hasActiveRevisionRequest) {
            assignment.setStatus(AssignmentStatus.revision_requested);
            taskAssignmentRepository.save(assignment);
            
            // Gửi event thông báo specialist khi manager reject submission lần đầu (không phải revision)
            try {
                ContractMilestone milestone = null;
                String milestoneName = "milestone";
                if (assignment.getMilestoneId() != null && assignment.getContractId() != null) {
                    milestone = contractMilestoneRepository
                            .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                            .orElse(null);
                    if (milestone != null && milestone.getName() != null) {
                        milestoneName = milestone.getName();
                    }
                }
                
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                        ? contract.getContractNumber()
                        : contract.getContractId();
                
                // Determine actionUrl based on taskType
                String actionUrl = "/transcription/my-tasks"; // default
                if (assignment.getTaskType() != null) {
                    actionUrl = switch (assignment.getTaskType()) {
                        case transcription -> "/transcription/my-tasks";
                        case arrangement -> "/arrangement/my-tasks";
                        case recording_supervision -> "/recording-artist/my-tasks";
                    };
                }
                
                SubmissionRejectedEvent event = SubmissionRejectedEvent.builder()
                        .eventId(java.util.UUID.randomUUID())
                        .submissionId(submissionId)
                        .submissionName(submission.getSubmissionName())
                        .taskAssignmentId(assignment.getAssignmentId())
                        .milestoneId(assignment.getMilestoneId())
                        .milestoneName(milestoneName)
                        .contractId(assignment.getContractId())
                        .contractNumber(contractLabel)
                        .specialistId(assignment.getSpecialistId())
                        .specialistUserId(assignment.getSpecialistUserIdSnapshot())
                        .managerUserId(userId)
                        .rejectionReason(reason)
                        .taskType(assignment.getTaskType() != null ? assignment.getTaskType().toString() : null)
                        .fileCount(files.size())
                        .title("Submission đã bị từ chối")
                        .content(String.format(
                                "Manager đã từ chối submission \"%s\" cho task \"%s\" của milestone \"%s\" trong contract #%s. %s",
                                submission.getSubmissionName(),
                                assignment.getTaskType() != null ? assignment.getTaskType().toString() : "task",
                                milestoneName,
                                contractLabel,
                                reason != null ? "Lý do: " + reason : "Vui lòng chỉnh sửa lại."))
                        .referenceType("SUBMISSION")
                        .actionUrl(actionUrl)
                        .rejectedAt(LocalDateTime.now())
                        .timestamp(LocalDateTime.now())
                        .build();
                
                JsonNode payload = objectMapper.valueToTree(event);
                java.util.UUID aggregateId;
                try {
                    aggregateId = java.util.UUID.fromString(submissionId);
                } catch (IllegalArgumentException ex) {
                    aggregateId = java.util.UUID.randomUUID();
                }
                
                OutboxEvent outboxEvent = OutboxEvent.builder()
                        .aggregateId(aggregateId)
                        .aggregateType("Submission")
                        .eventType("submission.rejected")
                        .eventPayload(payload)
                        .build();
                
                outboxEventRepository.save(outboxEvent);
                log.info(
                        "Queued SubmissionRejectedEvent in outbox: eventId={}, submissionId={}, assignmentId={}, specialistUserId={}",
                        event.getEventId(), submissionId, assignment.getAssignmentId(), assignment.getSpecialistUserIdSnapshot());
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue SubmissionRejectedEvent: submissionId={}, assignmentId={}, error={}",
                        submissionId, assignment.getAssignmentId(), e.getMessage(), e);
            }
        } else {
            // Update revision request nếu có
            try {
                revisionRequestService.updateRevisionRequestOnRejection(assignment.getAssignmentId(), reason);
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.warn("Failed to update revision request on rejection: assignmentId={}, error={}",
                        assignment.getAssignmentId(), e.getMessage());
            }
        }

        log.info("Rejected submission: submissionId={}, reason={}", submissionId, reason);
        
        // Update progress percentage cho assignment
        try {
            taskAssignmentService.updateProgressForAssignment(assignment.getAssignmentId());
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.warn("Failed to update progress for assignment: assignmentId={}, error={}", 
                assignment.getAssignmentId(), e.getMessage());
        }

        return toResponse(saved);
    }

    /**
     * Customer review submission (accept hoặc request revision)
     * Khi request revision, sẽ tạo RevisionRequest mới
     */
    @Transactional
    public FileSubmissionResponse customerReviewSubmission(
            String submissionId,
            String action, // "accept" or "request_revision"
            String title, // Required if action = "request_revision"
            String description, // Required if action = "request_revision"
            String userId,
            List<String> userRoles) {

        log.info("Customer {} reviewing submission: {}, action: {}", userId, submissionId, action);

        // Verify user is CUSTOMER
        if (!userRoles.contains("CUSTOMER")) {
            throw UnauthorizedException.create("Only customers can review submissions");
        }

        FileSubmission submission = fileSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> FileSubmissionNotFoundException.byId(submissionId));

        // Verify submission is delivered
        // Customer chỉ có thể review submissions đã delivered (chưa accept)
        // Nếu đã customer_accepted thì không thể review lại
        if (submission.getStatus() != SubmissionStatus.delivered) {
            throw InvalidSubmissionStatusException.cannotReview(submissionId, submission.getStatus());
        }

        // Verify customer has access to assignment
        TaskAssignment assignment = taskAssignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(submission.getAssignmentId()));

        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));

        if (!contract.getUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only review submissions from your own contracts");
        }

        if ("accept".equalsIgnoreCase(action)) {
            // Customer accepts submission
            LocalDateTime now = LocalDateTime.now();

            // Check xem có revision request đang WAITING_CUSTOMER_CONFIRM không
            List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                    assignment.getAssignmentId(), RevisionRequestStatus.WAITING_CUSTOMER_CONFIRM);

            if (!activeRevisions.isEmpty()) {
                // Có revision request → update revision request → COMPLETED
                // (updateRevisionRequestOnCustomerAccept sẽ set completedDate, finalCompletedAt
                // và update revised submission status thành customer_accepted)
                revisionRequestService.updateRevisionRequestOnCustomerAccept(assignment.getAssignmentId(), userId);
                log.info("Updated revision request on customer accept: assignmentId={}", assignment.getAssignmentId());
                // Note: Không cần update submission status ở đây vì đã được xử lý trong updateRevisionRequestOnCustomerAccept
            } else {
                // Không có revision request → đây là flow bình thường (accept submission lần
                // đầu)
                // Set completedDate cho task assignment (đồng bộ với finalCompletedAt)
                assignment.setStatus(AssignmentStatus.completed);
                assignment.setCompletedDate(now);
                taskAssignmentRepository.save(assignment);
                log.info(
                        "Task assignment marked as completed after customer accepted (first time, no revision): assignmentId={}",
                        assignment.getAssignmentId());

                // Track finalCompletedAt cho milestone
                if (assignment.getMilestoneId() != null && assignment.getContractId() != null) {
                    ContractMilestone milestone = contractMilestoneRepository
                            .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                            .orElse(null);
                    if (milestone != null && milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_CUSTOMER) {
                        // Kiểm tra xem milestone có payment (installment) không
                        // Nếu không có payment → set COMPLETED luôn
                        // Nếu có payment → set READY_FOR_PAYMENT
                        Optional<ContractInstallment> installmentOpt = contractInstallmentRepository
                                .findByContractIdAndMilestoneId(assignment.getContractId(), milestone.getMilestoneId());
                        boolean hasPayment = installmentOpt.isPresent();
                        
                        if (hasPayment) {
                            milestone.setWorkStatus(MilestoneWorkStatus.READY_FOR_PAYMENT);
                            milestone.setFinalCompletedAt(now);
                            contractMilestoneRepository.save(milestone);
                            log.info(
                                    "Tracked final completion time for milestone (first acceptance, no revision): milestoneId={}, finalCompletedAt={}, workStatus=READY_FOR_PAYMENT",
                                    milestone.getMilestoneId(), milestone.getFinalCompletedAt());
                            
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
                            log.info(
                                    "Tracked final completion time for milestone (first acceptance, no revision, no payment): milestoneId={}, finalCompletedAt={}, workStatus=COMPLETED",
                                    milestone.getMilestoneId(), milestone.getFinalCompletedAt());
                            
                            // Unlock milestone tiếp theo khi milestone này được hoàn thành (không có payment)
                            if (milestone.getOrderIndex() != null) {
                                contractService.unlockNextMilestone(assignment.getContractId(), milestone.getOrderIndex());
                            }
                        }
                        
                        // Link arrangement submission với recording milestone (nếu milestone này là arrangement)
                        if (milestone.getMilestoneType() == MilestoneType.arrangement) {
                            linkArrangementSubmissionToRecordingMilestone(milestone, submissionId, assignment.getContractId());
                        }
                    }
                }
                log.debug(
                        "No active revision request found for assignment: assignmentId={}, this is normal for first-time acceptance",
                        assignment.getAssignmentId());
                
                // Update submission status to customer_accepted (chỉ khi không có revision request)
                submission.setStatus(SubmissionStatus.customer_accepted);
                fileSubmissionRepository.save(submission);
                log.info("Submission status updated to customer_accepted: submissionId={}", submissionId);
            }

            log.info("Customer accepted submission: submissionId={}", submissionId);

        } else if ("request_revision".equalsIgnoreCase(action)) {
            // Customer requests revision
            if (title == null || title.trim().isEmpty()) {
                throw ValidationException.missingField("Title");
            }
            if (description == null || description.trim().isEmpty()) {
                throw ValidationException.missingField("Description");
            }

            // Customer reject revision hiện tại (nếu có) và request revision mới
            // updateRevisionRequestOnCustomerReject sẽ tự xử lý cả 2 trường hợp:
            // - Có revision cũ → mark COMPLETED và tạo mới
            // - Không có revision cũ → tạo mới trực tiếp
            try {
                RevisionRequestResponse newRevisionRequest = revisionRequestService.updateRevisionRequestOnCustomerReject(
                        assignment.getAssignmentId(),
                        userId,
                        title,
                        description,
                        submissionId,
                        assignment.getContractId(),
                        assignment.getMilestoneId(),
                        null);  // paidWalletTxId = null vì đây là flow customer request revision free (chưa thanh toán)
                log.info("Customer created/rejected revision request: assignmentId={}, newRevisionRequestId={}",
                        assignment.getAssignmentId(), newRevisionRequest.getRevisionRequestId());
            } catch (Exception e) {
                log.error("Failed to handle revision request: assignmentId={}, error={}",
                        assignment.getAssignmentId(), e.getMessage(), e);
                throw e;
            }

        } else {
            throw ValidationException.invalidAction(action, "'accept' or 'request_revision'");
        }
        
        // Update progress percentage cho assignment
        try {
            taskAssignmentService.updateProgressForAssignment(assignment.getAssignmentId());
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.warn("Failed to update progress for assignment: assignmentId={}, error={}", 
                assignment.getAssignmentId(), e.getMessage());
        }

        return toResponse(submission);
    }

    /**
     * Manager deliver submission to customer (deliver tất cả files trong
     * submission)
     */
    @Transactional
    public FileSubmissionResponse deliverSubmission(
            String submissionId,
            String userId,
            List<String> userRoles) {

        log.info("Manager {} delivering submission to customer: {}", userId, submissionId);

        // Verify user is MANAGER
        if (!userRoles.contains("MANAGER") && !userRoles.contains("SYSTEM_ADMIN")) {
            throw UnauthorizedException.create("Only managers can deliver submissions");
        }

        FileSubmission submission = fileSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> FileSubmissionNotFoundException.byId(submissionId));

        // Verify manager has access to assignment
        TaskAssignment assignment = taskAssignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(submission.getAssignmentId()));

        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));

        if (!contract.getManagerUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only deliver submissions from your contracts");
        }

        // Chỉ deliver submission đã approved
        if (submission.getStatus() != SubmissionStatus.approved) {
            throw InvalidSubmissionStatusException.cannotDeliver(submissionId, submission.getStatus());
        }

        // Lấy tất cả files trong submission
        List<File> submissionFiles = fileRepository.findBySubmissionId(submissionId);

        if (submissionFiles.isEmpty()) {
            throw InvalidStateException.noFiles("Submission");
        }

        // Kiểm tra tất cả files phải đã approved
        for (File file : submissionFiles) {
            if (file.getFileStatus() != FileStatus.approved) {
                throw InvalidFileStatusException.cannotDeliver(file.getFileId(), file.getFileStatus());
            }
        }

        // Deliver tất cả files trong submission
        LocalDateTime now = LocalDateTime.now();
        submissionFiles.forEach(file -> {
            file.setDeliveredToCustomer(true);
            file.setDeliveredAt(now);
            file.setDeliveredBy(userId);
            // Set fileSource = task_deliverable nếu chưa set
            if (file.getFileSource() != FileSourceType.task_deliverable) {
                file.setFileSource(FileSourceType.task_deliverable);
            }
        });
        fileRepository.saveAll(submissionFiles);
        log.info("Delivered {} files in submission: {}", submissionFiles.size(), submissionId);

        // Update submission status thành delivered
        submission.setStatus(SubmissionStatus.delivered);
        fileSubmissionRepository.save(submission);
        log.info("Submission status updated to delivered: submissionId={}", submissionId);

        // Check xem có revision request đang APPROVED_PENDING_DELIVERY không
        // Nếu có → đây là delivery cho revision, update revision request thành
        // WAITING_CUSTOMER_CONFIRM
        boolean hasActiveRevisionRequest = false;
        try {
            List<RevisionRequest> activeRevisions = revisionRequestRepository.findByTaskAssignmentIdAndStatus(
                    assignment.getAssignmentId(), RevisionRequestStatus.APPROVED_PENDING_DELIVERY);

            if (!activeRevisions.isEmpty()) {
                // Update revision request: APPROVED_PENDING_DELIVERY → WAITING_CUSTOMER_CONFIRM
                revisionRequestService.updateRevisionRequestOnDelivery(activeRevisions.get(0), userId);
                hasActiveRevisionRequest = true; // Đã update thành WAITING_CUSTOMER_CONFIRM
            }
        } catch (Exception e) {
            log.warn("Failed to check/update revision requests for assignment: {}, error={}",
                    assignment.getAssignmentId(), e.getMessage());
        }

        // Update assignment status: delivery_pending → waiting_customer_review
        if (assignment.getStatus() == AssignmentStatus.delivery_pending) {
            assignment.setStatus(AssignmentStatus.waiting_customer_review);
            taskAssignmentRepository.save(assignment);
            log.info(
                    "Task assignment status updated to waiting_customer_review after delivery: assignmentId={}, hasRevision={}",
                    assignment.getAssignmentId(), hasActiveRevisionRequest);
        } else {
            log.info("Submission delivered to customer: assignmentId={}, hasRevision={}, currentStatus={}",
                    assignment.getAssignmentId(), hasActiveRevisionRequest, assignment.getStatus());
        }

        // Update milestone work status: IN_PROGRESS → WAITING_CUSTOMER
        // (Cả flow bình thường và revision flow đều có milestone ở IN_PROGRESS khi
        // deliver)
        // Note: Nếu milestone đã ở WAITING_CUSTOMER (đã deliver trước đó), không cần
        // update lại
        if (assignment.getMilestoneId() != null && assignment.getContractId() != null) {
            ContractMilestone milestone = contractMilestoneRepository
                    .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                    .orElse(null);
            if (milestone != null) {
                // Chỉ update nếu milestone đang ở IN_PROGRESS (chưa deliver lần nào hoặc đã
                // revision lại)
                if (milestone.getWorkStatus() == MilestoneWorkStatus.IN_PROGRESS) {
                    milestone.setWorkStatus(MilestoneWorkStatus.WAITING_CUSTOMER);

                    // Track firstSubmissionAt: chỉ set lần đầu tiên (khi chưa có revision)
                    // Nếu milestone.firstSubmissionAt == null → đây là lần giao đầu tiên
                    if (milestone.getFirstSubmissionAt() == null) {
                        milestone.setFirstSubmissionAt(now);
                        log.info("Tracked first submission time for milestone: milestoneId={}, firstSubmissionAt={}",
                                milestone.getMilestoneId(), milestone.getFirstSubmissionAt());
                    }

                    contractMilestoneRepository.save(milestone);
                    log.info("Milestone work status updated to WAITING_CUSTOMER: milestoneId={}, contractId={}",
                            milestone.getMilestoneId(), assignment.getContractId());
                } else if (milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_CUSTOMER) {
                    // Milestone đã ở WAITING_CUSTOMER (có thể đã deliver trước đó), không cần
                    // update
                    log.debug(
                            "Milestone already in WAITING_CUSTOMER status, skipping update: milestoneId={}, contractId={}",
                            milestone.getMilestoneId(), assignment.getContractId());
                }
            }
        }

        // Gửi Kafka event về submission delivered cho customer
        try {
            String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : contract.getContractId();

            ContractMilestone milestone = contractMilestoneRepository
                    .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                    .orElse(null);
            String milestoneName = milestone != null && milestone.getName() != null
                    ? milestone.getName()
                    : "milestone";

            // Lấy danh sách file IDs và file names từ submission
            List<String> fileIds = submissionFiles.stream()
                    .map(File::getFileId)
                    .collect(Collectors.toList());
            List<String> fileNames = submissionFiles.stream()
                    .map(File::getFileName)
                    .collect(Collectors.toList());

            SubmissionDeliveredEvent event = SubmissionDeliveredEvent.builder()
                    .eventId(java.util.UUID.randomUUID())
                    .submissionId(submissionId)
                    .submissionName(submission.getSubmissionName())
                    .assignmentId(assignment.getAssignmentId())
                    .milestoneId(assignment.getMilestoneId())
                    .milestoneName(milestoneName)
                    .contractId(assignment.getContractId())
                    .contractNumber(contractLabel)
                    .customerUserId(contract.getUserId())
                    .fileIds(fileIds)
                    .fileNames(fileNames)
                    .title("Submission đã được gửi cho bạn")
                    .content(String.format(
                            "Manager đã gửi submission \"%s\" cho milestone \"%s\" của contract #%s. Vui lòng xem xét và phản hồi.",
                            submission.getSubmissionName(),
                            milestoneName,
                            contractLabel))
                    .referenceType("SUBMISSION")
                    .actionUrl("/contracts/" + assignment.getContractId() + "/milestones/" + assignment.getMilestoneId()
                            + "/deliveries")
                    .deliveredAt(now)
                    .timestamp(now)
                    .build();

            JsonNode payload = objectMapper.valueToTree(event);
            java.util.UUID aggregateId;
            try {
                aggregateId = java.util.UUID.fromString(submissionId);
            } catch (IllegalArgumentException ex) {
                aggregateId = java.util.UUID.randomUUID();
            }

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("Submission")
                    .eventType("submission.delivered")
                    .eventPayload(payload)
                    .build();

            outboxEventRepository.save(outboxEvent);
            log.info(
                    "Queued SubmissionDeliveredEvent in outbox: eventId={}, submissionId={}, assignmentId={}, customerUserId={}",
                    event.getEventId(), submissionId, assignment.getAssignmentId(), contract.getUserId());
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue SubmissionDeliveredEvent: submissionId={}, assignmentId={}, error={}",
                    submissionId, assignment.getAssignmentId(), e.getMessage(), e);
        }

        return toResponse(submission);
    }

    /**
     * Helper: Get next version number for assignment
     */
    private Integer getNextVersion(String assignmentId) {
        FileSubmission latest = fileSubmissionRepository
                .findFirstByAssignmentIdOrderByCreatedAtDesc(assignmentId)
                .orElse(null);

        if (latest == null || latest.getVersion() == null) {
            return 1;
        }

        return latest.getVersion() + 1;
    }

    /**
     * Helper: Convert entity to response DTO
     */
    private FileSubmissionResponse toResponse(FileSubmission submission) {
        // Get files in submission
        List<File> files = fileRepository.findBySubmissionId(submission.getSubmissionId());
        return toResponseWithFiles(submission, files);
    }

    /**
     * Helper: Convert entity to response DTO with pre-loaded files (optimized for batch loading)
     */
    private FileSubmissionResponse toResponseWithFiles(FileSubmission submission, List<File> files) {
        List<FileInfoResponse> fileInfos = files.stream()
                .map(this::toFileInfoResponse)
                .collect(Collectors.toList());

        Long totalSize = files.stream()
                .mapToLong(File::getFileSize)
                .sum();

        // Use mapper for basic mapping
        FileSubmissionResponse response = fileSubmissionMapper.toResponse(submission);

        // Set fields that require additional logic
        response.setFiles(fileInfos);
        response.setFileCount(files.size());
        response.setTotalSize(totalSize);

        return response;
    }

    /**
     * Helper: Convert File entity to FileInfoResponse
     */
    private FileInfoResponse toFileInfoResponse(File file) {
        return FileInfoResponse.builder()
                .fileId(file.getFileId())
                .fileName(file.getFileName())
                .fileSize(file.getFileSize())
                .mimeType(file.getMimeType())
                .contentType(file.getContentType() != null ? file.getContentType().name() : null)
                .fileSource(file.getFileSource())
                .description(file.getDescription())
                .uploadDate(file.getUploadDate())
                .fileStatus(file.getFileStatus() != null ? file.getFileStatus().name() : null)
                .deliveredToCustomer(file.getDeliveredToCustomer())
                .deliveredAt(file.getDeliveredAt())
                .reviewedAt(file.getReviewedAt())
                .rejectionReason(file.getRejectionReason())
                .build();
    }
    
    /**
     * Link arrangement submission với recording milestone trong cùng contract
     * Được gọi khi arrangement milestone được customer accept
     * 
     * Logic:
     * - Chỉ link nếu arrangement milestone này là arrangement milestone cuối cùng (orderIndex cao nhất)
     * - Luôn update (overwrite) để đảm bảo link với submission mới nhất khi có revision
     */
    private void linkArrangementSubmissionToRecordingMilestone(
            ContractMilestone arrangementMilestone, 
            String submissionId, 
            String contractId) {
        try {
            // Tìm tất cả arrangement milestones trong contract
            List<ContractMilestone> allMilestones = contractMilestoneRepository
                    .findByContractIdOrderByOrderIndexAsc(contractId);
            
            // Tìm arrangement milestones
            List<ContractMilestone> arrangementMilestones = allMilestones.stream()
                    .filter(m -> m.getMilestoneType() == MilestoneType.arrangement)
                    .toList();
            
            // Chỉ link nếu arrangement milestone này là arrangement milestone cuối cùng (orderIndex cao nhất)
            // Vì recording cần file arrangement cuối cùng
            boolean isLastArrangementMilestone = true;
            if (!arrangementMilestones.isEmpty() && arrangementMilestone.getOrderIndex() != null) {
                Integer maxOrderIndex = arrangementMilestones.stream()
                        .filter(m -> m.getOrderIndex() != null)
                        .map(ContractMilestone::getOrderIndex)
                        .max(Integer::compareTo)
                        .orElse(null);
                isLastArrangementMilestone = maxOrderIndex != null 
                        && maxOrderIndex.equals(arrangementMilestone.getOrderIndex());
            }
            
            if (!isLastArrangementMilestone) {
                log.debug("Skipping link: arrangement milestone is not the last one. arrangementMilestoneId={}, orderIndex={}, contractId={}",
                        arrangementMilestone.getMilestoneId(), arrangementMilestone.getOrderIndex(), contractId);
                return;
            }
            
            // Tìm recording milestone (có milestoneType = recording)
            Optional<ContractMilestone> recordingMilestoneOpt = allMilestones.stream()
                    .filter(m -> m.getMilestoneType() == MilestoneType.recording)
                    .findFirst();
            
            if (recordingMilestoneOpt.isPresent()) {
                ContractMilestone recordingMilestone = recordingMilestoneOpt.get();
                
                // Luôn update (overwrite) để đảm bảo link với submission mới nhất khi có revision
                recordingMilestone.setSourceArrangementMilestoneId(arrangementMilestone.getMilestoneId());
                recordingMilestone.setSourceArrangementSubmissionId(submissionId);
                contractMilestoneRepository.save(recordingMilestone);
                
                log.info("Linked arrangement submission to recording milestone: arrangementMilestoneId={}, submissionId={}, recordingMilestoneId={}, contractId={}",
                        arrangementMilestone.getMilestoneId(), submissionId, recordingMilestone.getMilestoneId(), contractId);
            } else {
                log.debug("No recording milestone found in contract: contractId={}", contractId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to link arrangement submission to recording milestone: arrangementMilestoneId={}, submissionId={}, contractId={}, error={}",
                    arrangementMilestone.getMilestoneId(), submissionId, contractId, e.getMessage(), e);
        }
    }
    
    /**
     * Internal method: Get submission by ID without access check (for internal use)
     * Dùng để fetch arrangement submission cho recording milestone
     */
    public FileSubmissionResponse getSubmissionInternal(String submissionId) {
        FileSubmission submission = fileSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> FileSubmissionNotFoundException.byId(submissionId));
        return toResponse(submission);
    }
}
