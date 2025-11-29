package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.dto.response.FileSubmissionResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.entity.FileSubmission;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.SubmissionStatus;
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
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.repository.FileSubmissionRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
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
     */
    public List<FileSubmissionResponse> getSubmissionsByAssignmentId(String assignmentId, String userId, List<String> userRoles) {
        // Verify assignment access first
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Check specialist access - so sánh với specialistUserIdSnapshot (userId/email)
        String specialistUserId = assignment.getSpecialistUserIdSnapshot();
        boolean hasAccess = specialistUserId != null && specialistUserId.equals(userId);
        
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

