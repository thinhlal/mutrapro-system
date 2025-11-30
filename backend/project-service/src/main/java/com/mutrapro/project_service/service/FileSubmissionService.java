package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.dto.response.FileSubmissionResponse;
import com.mutrapro.project_service.dto.response.CustomerDeliveriesResponse;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.entity.FileSubmission;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.SubmissionStatus;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.FileNotBelongToAssignmentException;
import com.mutrapro.project_service.exception.FileSubmissionNotFoundException;
import com.mutrapro.project_service.exception.InvalidFileStatusException;
import com.mutrapro.project_service.exception.InvalidSubmissionStatusException;
import com.mutrapro.project_service.exception.InvalidTaskAssignmentStatusException;
import com.mutrapro.project_service.exception.NoFilesSelectedException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.mapper.FileSubmissionMapper;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.repository.FileSubmissionRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.shared.event.SubmissionDeliveredEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
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
    OutboxEventRepository outboxEventRepository;
    RequestServiceFeignClient requestServiceFeignClient;
    ObjectMapper objectMapper;
    FileSubmissionMapper fileSubmissionMapper;

    /**
     * Submit files for review - Backend tự động tạo submission, add files và submit
     * FE chỉ cần gọi với assignmentId và fileIds, backend sẽ tự động xử lý tất cả
     * 
     * @param assignmentId ID của task assignment
     * @param fileIds Danh sách file IDs cần submit
     * @param userId ID của specialist
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
        // So sánh với specialistUserIdSnapshot (userId/email) chứ không phải specialistId (UUID)
        String specialistUserId = assignment.getSpecialistUserIdSnapshot();
        if (specialistUserId == null || !specialistUserId.equals(userId)) {
            throw UnauthorizedException.create("You can only submit files for your own tasks");
        }
        
        // Only allow submit if task is in_progress or revision_requested
        if (assignment.getStatus() != AssignmentStatus.in_progress 
                && assignment.getStatus() != AssignmentStatus.revision_requested) {
            throw InvalidTaskAssignmentStatusException.cannotSubmitForReview(
                assignment.getAssignmentId(), 
                assignment.getStatus()
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
        
        // 1. Tự động tạo submission package
        Integer nextVersion = getNextVersion(assignmentId);
        
        FileSubmission submission = FileSubmission.builder()
                .assignmentId(assignmentId)
                .submissionName(String.format("Submission v%d", nextVersion))
                .status(SubmissionStatus.draft)
                .createdBy(userId)
                .createdAt(Instant.now())
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
        log.info("Added {} files to submission and updated status: submissionId={}", filesToSubmit.size(), submissionId);
        
        // 3. Tự động submit submission for review
        savedSubmission.setStatus(SubmissionStatus.pending_review);
        savedSubmission.setSubmittedAt(Instant.now());
        FileSubmission submittedSubmission = fileSubmissionRepository.save(savedSubmission);
        
        // Update assignment status to ready_for_review
        assignment.setStatus(AssignmentStatus.ready_for_review);
        taskAssignmentRepository.save(assignment);
        
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
    public List<FileSubmissionResponse> getSubmissionsByAssignmentId(String assignmentId, String userId, List<String> userRoles) {
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
        
        // Verify contract access - customer phải là owner của contract
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
                .orElseThrow(() -> new IllegalArgumentException("Milestone not found in contract"));
        
        // Sử dụng JPA query riêng để query trực tiếp từ milestone
        List<FileSubmission> deliveredSubmissions = fileSubmissionRepository
                .findDeliveredSubmissionsByMilestoneAndContract(
                        milestoneId,
                        contractId,
                        SubmissionStatus.delivered
                );
        
        // Build response với contract, milestone và submissions
        CustomerDeliveriesResponse.ContractInfo contractInfo = CustomerDeliveriesResponse.ContractInfo.builder()
                .contractId(contract.getContractId())
                .contractNumber(contract.getContractNumber())
                .contractType(contract.getContractType() != null ? contract.getContractType().toString() : null)
                .build();
        
        CustomerDeliveriesResponse.MilestoneInfo milestoneInfo = CustomerDeliveriesResponse.MilestoneInfo.builder()
                .milestoneId(milestone.getMilestoneId())
                .name(milestone.getName())
                .description(milestone.getDescription())
                .workStatus(milestone.getWorkStatus() != null ? milestone.getWorkStatus().toString() : null)
                .plannedDueDate(milestone.getPlannedDueDate())
                .actualStartAt(milestone.getActualStartAt())
                .actualEndAt(milestone.getActualEndAt())
                .build();
        
        List<FileSubmissionResponse> submissionResponses = deliveredSubmissions.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        
        // Load request info nếu có requestId
        CustomerDeliveriesResponse.RequestInfo requestInfo = null;
        if (contract.getRequestId() != null) {
            try {
                ApiResponse<ServiceRequestInfoResponse> requestResponse = 
                    requestServiceFeignClient.getServiceRequestById(contract.getRequestId());
                if (requestResponse != null && "success".equals(requestResponse.getStatus()) 
                    && requestResponse.getData() != null) {
                    ServiceRequestInfoResponse requestData = requestResponse.getData();
                    
                    log.debug("Request data from request-service - requestId: {}, files: {}", 
                        requestData.getRequestId(), requestData.getFiles());
                    
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
                    
                    // Lấy files từ project-service database (customer_upload files)
                    // Thay vì dùng files từ request-service response
                    List<File> customerUploadedFiles = fileRepository.findByRequestIdAndFileSourceIn(
                        contract.getRequestId(),
                        List.of(FileSourceType.customer_upload)
                    );
                    
                    // Convert File entities to List of Maps for response
                    List<Map<String, Object>> filesList = customerUploadedFiles.stream()
                        .map(file -> {
                            Map<String, Object> fileMap = new java.util.HashMap<>();
                            fileMap.put("fileId", file.getFileId());
                            fileMap.put("fileName", file.getFileName());
                            fileMap.put("fileSize", file.getFileSize());
                            fileMap.put("mimeType", file.getMimeType());
                            fileMap.put("url", null); // Không có URL trực tiếp, dùng fileId để preview/download
                            return fileMap;
                        })
                        .collect(Collectors.toList());
                    
                    log.debug("Found {} customer uploaded files for requestId: {}", filesList.size(), contract.getRequestId());
                    
                    requestInfo = CustomerDeliveriesResponse.RequestInfo.builder()
                        .requestId(requestData.getRequestId())
                        .serviceType(requestData.getRequestType())
                        .title(requestData.getTitle())
                        .description(requestData.getDescription())
                        .durationSeconds(durationSeconds)
                        .tempo(tempo)
                        .timeSignature(timeSignature)
                        .specialNotes(specialNotes)
                        .instruments(requestData.getInstruments())
                        .files(filesList) // Sử dụng files từ project-service database
                        .build();
                }
            } catch (Exception e) {
                log.warn("Failed to fetch request info for requestId {}: {}", contract.getRequestId(), e.getMessage());
            }
        }
        
        return CustomerDeliveriesResponse.builder()
                .contract(contractInfo)
                .milestone(milestoneInfo)
                .request(requestInfo)
                .submissions(submissionResponses)
                .build();
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
        submission.setReviewedAt(Instant.now());
        FileSubmission saved = fileSubmissionRepository.save(submission);
        
        // Update all files to approved
        List<File> files = fileRepository.findBySubmissionId(submissionId);
        files.forEach(file -> {
            file.setFileStatus(FileStatus.approved);
            file.setReviewedBy(userId);
            file.setReviewedAt(Instant.now());
        });
        fileRepository.saveAll(files);
        
        // Update task assignment status to delivery_pending
        if (assignment.getStatus() != AssignmentStatus.delivery_pending && 
            assignment.getStatus() != AssignmentStatus.completed) {
            assignment.setStatus(AssignmentStatus.delivery_pending);
            taskAssignmentRepository.save(assignment);
            log.info("Task assignment marked as delivery_pending: assignmentId={}", assignment.getAssignmentId());
        }
        
        log.info("Approved submission: submissionId={}, fileCount={}", submissionId, files.size());
        
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
        submission.setReviewedAt(Instant.now());
        submission.setRejectionReason(reason);
        FileSubmission saved = fileSubmissionRepository.save(submission);
        
        // Update all files to rejected
        List<File> files = fileRepository.findBySubmissionId(submissionId);
        files.forEach(file -> {
            file.setFileStatus(FileStatus.rejected);
            file.setReviewedBy(userId);
            file.setReviewedAt(Instant.now());
            file.setRejectionReason(reason);
        });
        fileRepository.saveAll(files);
        
        // Update assignment status back to revision_requested
        assignment.setStatus(AssignmentStatus.revision_requested);
        taskAssignmentRepository.save(assignment);
        
        log.info("Rejected submission: submissionId={}, reason={}", submissionId, reason);
        
        return toResponse(saved);
    }

    /**
     * Customer review submission (accept hoặc request revision)
     */
    @Transactional
    public FileSubmissionResponse customerReviewSubmission(
            String submissionId,
            String action,  // "accept" or "request_revision"
            String reason,  // Required if action = "request_revision"
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
        if (submission.getStatus() != SubmissionStatus.delivered) {
            throw new InvalidSubmissionStatusException(
                    "You can only review submissions that have been delivered. Current status: " + submission.getStatus(),
                    submissionId,
                    submission.getStatus());
        }
        
        // Verify customer has access to assignment
        TaskAssignment assignment = taskAssignmentRepository.findById(submission.getAssignmentId())
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(submission.getAssignmentId()));
        
        Contract contract = contractRepository.findById(assignment.getContractId())
                .orElseThrow(() -> ContractNotFoundException.byId(assignment.getContractId()));
        
        if (!contract.getUserId().equals(userId)) {
            throw UnauthorizedException.create("You can only review submissions from your own contracts");
        }
        
        Instant now = Instant.now();
        
        if ("accept".equalsIgnoreCase(action)) {
            // Customer accepts submission - giữ status = delivered
            // Có thể thêm field customerReviewedAt nếu cần
            log.info("Customer accepted submission: submissionId={}", submissionId);
            // Không cần thay đổi status, chỉ log lại
            
        } else if ("request_revision".equalsIgnoreCase(action)) {
            // Customer requests revision
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("Reason is required when requesting revision");
            }
            
            // Update submission status to revision_requested
            submission.setStatus(SubmissionStatus.revision_requested);
            submission.setRejectionReason(reason);
            submission.setReviewedBy(userId);
            submission.setReviewedAt(now);
            fileSubmissionRepository.save(submission);
            
            // Update assignment status to revision_requested
            assignment.setStatus(AssignmentStatus.revision_requested);
            taskAssignmentRepository.save(assignment);
            
            // Update milestone work status back to IN_PROGRESS (nếu đang WAITING_CUSTOMER)
            if (assignment.getMilestoneId() != null && assignment.getContractId() != null) {
                ContractMilestone milestone = contractMilestoneRepository
                        .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                        .orElse(null);
                if (milestone != null && milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_CUSTOMER) {
                    milestone.setWorkStatus(MilestoneWorkStatus.IN_PROGRESS);
                    contractMilestoneRepository.save(milestone);
                    log.info("Milestone work status updated to IN_PROGRESS after customer requested revision: milestoneId={}, contractId={}", 
                            milestone.getMilestoneId(), assignment.getContractId());
                }
            }
            
            log.info("Customer requested revision for submission: submissionId={}, reason={}", submissionId, reason);
            
        } else {
            throw new IllegalArgumentException("Invalid action: " + action + ". Must be 'accept' or 'request_revision'");
        }
        
        return toResponse(submission);
    }

    /**
     * Manager deliver submission to customer (deliver tất cả files trong submission)
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
            throw new IllegalStateException("Submission has no files to deliver");
        }
        
        // Kiểm tra tất cả files phải đã approved
        for (File file : submissionFiles) {
            if (file.getFileStatus() != FileStatus.approved) {
                throw InvalidFileStatusException.cannotDeliver(file.getFileId(), file.getFileStatus());
            }
        }
        
        // Deliver tất cả files trong submission
        Instant now = Instant.now();
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
        
        // Cập nhật task assignment status thành completed
        if (assignment.getStatus() == AssignmentStatus.delivery_pending) {
            assignment.setStatus(AssignmentStatus.completed);
            assignment.setCompletedDate(now);
            taskAssignmentRepository.save(assignment);
            log.info("Task assignment marked as completed after submission delivered: assignmentId={}", 
                    assignment.getAssignmentId());
            
            // Update milestone work status: IN_PROGRESS → WAITING_CUSTOMER
            if (assignment.getMilestoneId() != null && assignment.getContractId() != null) {
                ContractMilestone milestone = contractMilestoneRepository
                        .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                        .orElse(null);
                if (milestone != null && milestone.getWorkStatus() == MilestoneWorkStatus.IN_PROGRESS) {
                    milestone.setWorkStatus(MilestoneWorkStatus.WAITING_CUSTOMER);
                    contractMilestoneRepository.save(milestone);
                    log.info("Milestone work status updated to WAITING_CUSTOMER: milestoneId={}, contractId={}", 
                            milestone.getMilestoneId(), assignment.getContractId());
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
                        .content(String.format("Manager đã gửi submission \"%s\" cho milestone \"%s\" của contract #%s. Vui lòng xem xét và phản hồi.", 
                                submission.getSubmissionName(),
                                milestoneName,
                                contractLabel))
                        .referenceType("SUBMISSION")
                        .actionUrl("/contracts/" + assignment.getContractId())
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
                log.info("Queued SubmissionDeliveredEvent in outbox: eventId={}, submissionId={}, assignmentId={}, customerUserId={}", 
                        event.getEventId(), submissionId, assignment.getAssignmentId(), contract.getUserId());
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue SubmissionDeliveredEvent: submissionId={}, assignmentId={}, error={}", 
                        submissionId, assignment.getAssignmentId(), e.getMessage(), e);
            }
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
}

