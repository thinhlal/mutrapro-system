package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.ContentType;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.exception.FileNotFoundException;
import com.mutrapro.project_service.exception.FileUploadException;
import com.mutrapro.project_service.exception.InvalidFileStatusException;
import com.mutrapro.project_service.exception.InvalidFileTypeForTaskException;
import com.mutrapro.project_service.exception.InvalidTaskAssignmentStatusException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.shared.event.FileUploadedEvent;
import com.mutrapro.shared.event.TaskFileUploadedEvent;
import com.mutrapro.shared.service.S3Service;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileService {

    FileRepository fileRepository;
    TaskAssignmentRepository taskAssignmentRepository;
    ContractRepository contractRepository;
    S3Service s3Service;
    FileAccessService fileAccessService;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;

    @Transactional
    public void createFileFromEvent(FileUploadedEvent event) {
        // Idempotency is handled at consumer level (BaseIdempotentConsumer with consumed_events table)
        // This method is only called if the event hasn't been processed before
        
        // Convert event to File entity
        File file = File.builder()
                .fileName(event.getFileName())
                .fileKeyS3(event.getFileKeyS3())
                .fileSize(event.getFileSize())
                .mimeType(event.getMimeType())
                .fileSource(FileSourceType.valueOf(event.getFileSource()))
                .contentType(ContentType.valueOf(event.getContentType()))
                .description(event.getDescription())
                .uploadDate(event.getUploadDate() != null ? event.getUploadDate() : java.time.Instant.now())
                .createdBy(event.getCreatedBy())
                .requestId(event.getRequestId())
                .assignmentId(event.getAssignmentId())
                .bookingId(event.getBookingId())
                .fileStatus(FileStatus.uploaded)
                .deliveredToCustomer(false)
                .build();

        File saved = fileRepository.save(file);
        log.info("File created from event: fileId={}, fileName={}, requestId={}, eventId={}",
                saved.getFileId(), saved.getFileName(), saved.getRequestId(), event.getEventId());

    }

    public List<FileInfoResponse> getFilesByRequestId(String requestId, String userId, List<String> userRoles) {
        if (requestId == null || requestId.trim().isEmpty()) {
            log.warn("RequestId is null or empty");
            return List.of();
        }
        
        try {
            // CRITICAL OPTIMIZATION: Verify contract ownership một lần cho MANAGER và SPECIALIST
            boolean skipFileAccessCheck = false;
            
            // Tìm contract từ requestId (cần cho cả manager và specialist check)
            List<Contract> contracts = contractRepository.findByRequestId(requestId);
            if (contracts.isEmpty()) {
                log.debug("No contract found for requestId: {}", requestId);
                return List.of();
            }
            Contract contract = contracts.getFirst();
            
            // Check MANAGER ownership
            if (userRoles.contains("MANAGER") || userRoles.contains("SYSTEM_ADMIN")) {
                if (userId.equals(contract.getManagerUserId())) {
                    skipFileAccessCheck = true;
                    log.debug("Request {} belongs to contract managed by manager {}, skipping per-file access check", 
                            requestId, userId);
                }
            }
            
            // Check SPECIALIST ownership - nếu specialist có assignment thuộc contract của request này
            if (!skipFileAccessCheck) {
                boolean isSpecialist = userRoles.stream().anyMatch(role -> 
                    role.equalsIgnoreCase("TRANSCRIPTION") || 
                    role.equalsIgnoreCase("ARRANGEMENT") || 
                    role.equalsIgnoreCase("RECORDING_ARTIST")
                );
                
                if (isSpecialist) {
                    // Tìm assignments của specialist trong contract này
                    List<TaskAssignment> assignments = taskAssignmentRepository.findByContractId(contract.getContractId());
                    boolean hasAssignment = assignments.stream().anyMatch(assignment -> {
                        String specialistUserId = assignment.getSpecialistUserIdSnapshot() != null 
                                ? assignment.getSpecialistUserIdSnapshot() 
                                : assignment.getSpecialistId();
                        return userId.equals(specialistUserId);
                    });
                    
                    if (hasAssignment) {
                        skipFileAccessCheck = true;
                        log.debug("Request {} belongs to contract with assignments for specialist {}, skipping per-file access check", 
                                requestId, userId);
                    }
                }
            }
            
            // Lấy files với filter ở database level (chỉ customer_upload và contract_pdf)
            // (API này được dùng bởi request-service để hiển thị files cho customer và specialist)
            List<File> files = fileRepository.findByRequestIdAndFileSourceIn(
                    requestId, 
                    List.of(FileSourceType.customer_upload, FileSourceType.contract_pdf)
            );
            
            // Nếu đã verify ownership, skip file access check để tối ưu performance
            if (skipFileAccessCheck) {
                log.debug("Returning {} files (customer_upload + contract_pdf) for request {} without per-file access check", 
                        files.size(), requestId);
                return files.stream()
                        .map(f -> FileInfoResponse.builder()
                                .fileId(f.getFileId())
                                .fileName(f.getFileName())
                                .fileSize(f.getFileSize())
                                .mimeType(f.getMimeType())
                                .contentType(f.getContentType() != null ? f.getContentType().name() : null)
                                .fileSource(f.getFileSource())
                                .description(f.getDescription())
                                .uploadDate(f.getUploadDate())
                                .fileStatus(f.getFileStatus() != null ? f.getFileStatus().name() : null)
                                .deliveredToCustomer(f.getDeliveredToCustomer())
                                .deliveredAt(f.getDeliveredAt())
                                .reviewedAt(f.getReviewedAt())
                                .rejectionReason(f.getRejectionReason())
                                .build())
                        .collect(Collectors.toList());
            }
            
            // Nếu không verify được ownership, return empty list
            log.warn("User {} (roles: {}) không có quyền truy cập files của request {}", 
                    userId, userRoles, requestId);
            return List.of();
        } catch (Exception e) {
            log.error("Error fetching files for requestId: {}", requestId, e);
            throw e;
        }
    }

    public List<FileInfoResponse> getFilesByAssignmentId(String assignmentId, String userId, List<String> userRoles) {
        if (assignmentId == null || assignmentId.trim().isEmpty()) {
            log.warn("AssignmentId is null or empty");
            return List.of();
        }
        
        try {
            // CRITICAL OPTIMIZATION: Verify assignment/contract ownership một lần
            // Thay vì check từng file (N queries), chỉ cần 1-2 queries
            
            TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId).orElse(null);
            if (assignment == null) {
                log.warn("Assignment {} not found", assignmentId);
                return List.of();
            }
            
            boolean skipFileAccessCheck = false;
            
            // Check SPECIALIST ownership
            boolean isSpecialist = userRoles.stream().anyMatch(role -> 
                role.equalsIgnoreCase("TRANSCRIPTION") || 
                role.equalsIgnoreCase("ARRANGEMENT") || 
                role.equalsIgnoreCase("RECORDING_ARTIST")
            );
            
            if (isSpecialist) {
                String specialistUserId = assignment.getSpecialistUserIdSnapshot() != null 
                        ? assignment.getSpecialistUserIdSnapshot() 
                        : assignment.getSpecialistId();
                if (userId.equals(specialistUserId)) {
                    skipFileAccessCheck = true;
                    log.debug("Assignment {} belongs to specialist {}, skipping per-file access check", 
                            assignmentId, userId);
                }
            }
            
            // Check MANAGER ownership - CRITICAL: verify contract ownership một lần
            // Thay vì check từng file (mỗi file query contract) → chậm!
            if (!skipFileAccessCheck && (userRoles.contains("MANAGER") || userRoles.contains("SYSTEM_ADMIN"))) {
                Contract contract = contractRepository.findById(assignment.getContractId()).orElse(null);
                if (contract != null && userId.equals(contract.getManagerUserId())) {
                    skipFileAccessCheck = true;
                    log.debug("Assignment {} belongs to contract managed by manager {}, skipping per-file access check", 
                            assignmentId, userId);
                }
            }
            
            // Lấy files, loại trừ deleted files
            List<File> files = fileRepository.findByAssignmentIdAndFileStatusNot(assignmentId, FileStatus.deleted);
            
            // Nếu đã verify assignment ownership, skip file access check để tối ưu performance
            if (skipFileAccessCheck) {
                return files.stream()
                        .map(f -> FileInfoResponse.builder()
                                .fileId(f.getFileId())
                                .fileName(f.getFileName())
                                .fileSize(f.getFileSize())
                                .mimeType(f.getMimeType())
                                .contentType(f.getContentType() != null ? f.getContentType().name() : null)
                                .fileSource(f.getFileSource())
                                .description(f.getDescription())
                                .uploadDate(f.getUploadDate())
                                .fileStatus(f.getFileStatus() != null ? f.getFileStatus().name() : null)
                                .deliveredToCustomer(f.getDeliveredToCustomer())
                                .deliveredAt(f.getDeliveredAt())
                                .reviewedAt(f.getReviewedAt())
                                .rejectionReason(f.getRejectionReason())
                                .build())
                        .collect(Collectors.toList());
            }
            
            // Nếu chưa verify được, fallback về check từng file (cho manager, customer, etc.)
            return files.stream()
                    .filter(f -> {
                        try {
                            // Check quyền truy cập cho từng file
                            fileAccessService.checkFileAccess(f.getFileId(), userId, userRoles);
                            return true;
                        } catch (Exception e) {
                            // Nếu không có quyền, skip file này
                            log.debug("User {} không có quyền xem file {}: {}", userId, f.getFileId(), e.getMessage());
                            return false;
                        }
                    })
                    .map(f -> FileInfoResponse.builder()
                            .fileId(f.getFileId())
                            .fileName(f.getFileName())
                            .fileSize(f.getFileSize())
                            .mimeType(f.getMimeType())
                            .contentType(f.getContentType() != null ? f.getContentType().name() : null)
                            .fileSource(f.getFileSource())
                            .description(f.getDescription())
                            .uploadDate(f.getUploadDate())
                            .fileStatus(f.getFileStatus() != null ? f.getFileStatus().name() : null)
                            .deliveredToCustomer(f.getDeliveredToCustomer())
                            .deliveredAt(f.getDeliveredAt())
                            .reviewedAt(f.getReviewedAt())
                            .rejectionReason(f.getRejectionReason())
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching files for assignmentId: {}", assignmentId, e);
            throw e;
        }
    }

    @Transactional
    public FileInfoResponse uploadTaskFile(
            MultipartFile file, 
            String assignmentId, 
            String description, 
            String contentTypeStr,
            String userId) {
        
        // Validate assignment exists
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new TaskAssignmentNotFoundException(assignmentId));
        
        if (file.isEmpty()) {
            throw new FileUploadException("File is empty");
        }
        
        // Validate file type based on task type
        validateFileTypeForTask(assignment.getTaskType(), file.getOriginalFilename(), file.getContentType());
        
        // Get requestId and contract for notification
        String requestId = null;
        Contract contract = null;
        if (assignment.getContractId() != null) {
            contract = contractRepository.findById(assignment.getContractId()).orElse(null);
            if (contract != null) {
                requestId = contract.getRequestId();
            }
        }
        
        try {
            // Upload to S3 and get file key only (not URL for security)
            String fileKey = s3Service.uploadFileAndReturnKey(
                    file.getInputStream(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    "task-outputs/" + assignmentId  // folder prefix
            );
            
            // Parse content type
            ContentType contentType;
            try {
                contentType = ContentType.valueOf(contentTypeStr.toLowerCase());
            } catch (Exception e) {
                contentType = ContentType.notation;  // default
            }
            
            // Save file metadata (store file key, not URL)
            File fileEntity = File.builder()
                    .fileName(file.getOriginalFilename())
                    .fileKeyS3(fileKey)  // Store S3 object key
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType())
                    .fileSource(FileSourceType.specialist_output)
                    .contentType(contentType)
                    .description(description)
                    .uploadDate(Instant.now())
                    .createdBy(userId)
                    .assignmentId(assignmentId)
                    .requestId(requestId)
                    .submissionId(null)  // Can be set later if file is added to submission
                    .fileStatus(FileStatus.uploaded)  // Chờ specialist submit for review
                    .deliveredToCustomer(false)
                    .build();
            
            File saved = fileRepository.save(fileEntity);
            log.info("File uploaded successfully: fileId={}, assignmentId={}, fileName={}", 
                    saved.getFileId(), assignmentId, file.getOriginalFilename());
            
            // Enqueue notification event cho manager (Kafka)
            try {
                if (contract != null && contract.getManagerUserId() != null) {
                    String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                            ? contract.getContractNumber()
                            : assignment.getContractId();
                    
                    TaskFileUploadedEvent event = TaskFileUploadedEvent.builder()
                            .eventId(UUID.randomUUID())
                            .fileId(saved.getFileId())
                            .fileName(saved.getFileName())
                            .assignmentId(assignmentId)
                            .contractId(assignment.getContractId())
                            .contractNumber(contractLabel)
                            .taskType(assignment.getTaskType() != null ? assignment.getTaskType().name() : null)
                            .managerUserId(contract.getManagerUserId())
                            .title("Specialist đã upload file output")
                            .content(String.format("Specialist đã upload file \"%s\" cho task %s của contract #%s. Vui lòng chờ specialist submit for review.", 
                                    saved.getFileName(),
                                    assignment.getTaskType(),
                                    contractLabel))
                            .referenceType("TASK_ASSIGNMENT")
                            .actionUrl("/manager/contracts/" + assignment.getContractId())
                            .uploadedAt(saved.getUploadDate())
                            .timestamp(Instant.now())
                            .build();
                    
                    JsonNode payload = objectMapper.valueToTree(event);
                    UUID aggregateId;
                    try {
                        aggregateId = UUID.fromString(saved.getFileId());
                    } catch (IllegalArgumentException ex) {
                        aggregateId = UUID.randomUUID();
                    }
                    
                    OutboxEvent outboxEvent = OutboxEvent.builder()
                            .aggregateId(aggregateId)
                            .aggregateType("File")
                            .eventType("task.file.uploaded")
                            .eventPayload(payload)
                            .build();
                    
                    outboxEventRepository.save(outboxEvent);
                    log.info("Queued TaskFileUploadedEvent in outbox: eventId={}, fileId={}, assignmentId={}, managerUserId={}", 
                            event.getEventId(), saved.getFileId(), assignmentId, contract.getManagerUserId());
                } else {
                    log.warn("Cannot enqueue notification event: contract not found or managerUserId is null. contractId={}, assignmentId={}", 
                            assignment.getContractId(), assignmentId);
                }
            } catch (Exception e) {
                // Log error nhưng không fail transaction
                log.error("Failed to enqueue TaskFileUploadedEvent: assignmentId={}, error={}", 
                        assignmentId, e.getMessage(), e);
            }
            
            return FileInfoResponse.builder()
                    .fileId(saved.getFileId())
                    .fileName(saved.getFileName())
                    .fileSize(saved.getFileSize())
                    .mimeType(saved.getMimeType())
                    .contentType(saved.getContentType() != null ? saved.getContentType().name() : null)
                    .fileSource(saved.getFileSource())
                    .description(saved.getDescription())
                    .uploadDate(saved.getUploadDate())
                    .fileStatus(saved.getFileStatus() != null ? saved.getFileStatus().name() : null)
                    .deliveredToCustomer(saved.getDeliveredToCustomer())
                    .deliveredAt(saved.getDeliveredAt())
                    .reviewedAt(saved.getReviewedAt())
                    .rejectionReason(saved.getRejectionReason())
                    .build();
                    
        } catch (IOException e) {
            log.error("Error uploading file: {}", e.getMessage(), e);
            throw FileUploadException.failed(file.getOriginalFilename(), e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error uploading file: {}", e.getMessage(), e);
            throw FileUploadException.failed(file.getOriginalFilename(), "Unexpected error: " + e.getMessage(), e);
        }
    }

    /**
     * Validate file type based on task type
     * - transcription: chỉ cho notation files (musicxml, xml, mid, midi, pdf)
     * - arrangement: cho notation và audio files
     * - recording: chỉ cho audio files (mp3, wav, etc.)
     */
    private void validateFileTypeForTask(TaskType taskType, String fileName, String mimeType) {
        if (taskType == null) {
            throw InvalidFileTypeForTaskException.taskTypeRequired();
        }

        String lowerFileName = fileName != null ? fileName.toLowerCase(Locale.ROOT) : "";
        String lowerMimeType = mimeType != null ? mimeType.toLowerCase(Locale.ROOT) : "";
        
        // Extract file extension
        String extension = "";
        int lastDot = lowerFileName.lastIndexOf('.');
        if (lastDot > 0 && lastDot < lowerFileName.length() - 1) {
            extension = lowerFileName.substring(lastDot + 1);
        }

        // Define allowed extensions and mime types for each task type
        Set<String> notationExtensions = Set.of("musicxml", "xml", "mid", "midi", "pdf");
        Set<String> notationMimeTypes = Set.of(
            "application/xml", "text/xml", "application/xml-dtd",
            "audio/midi", "audio/mid", "audio/x-midi",
            "application/pdf"
        );
        
        Set<String> audioExtensions = Set.of("mp3", "wav", "flac", "aac", "ogg", "m4a", "wma");
        Set<String> audioMimeTypes = Set.of(
            "audio/mpeg", "audio/mp3", "audio/x-mpeg",
            "audio/wav", "audio/x-wav", "audio/wave",
            "audio/flac", "audio/x-flac",
            "audio/aac", "audio/mp4", "audio/x-m4a",
            "audio/ogg", "audio/vorbis"
        );

        boolean isValid;
        String allowedTypes = switch (taskType) {
            case transcription -> {
                // Chỉ cho notation files
                isValid = notationExtensions.contains(extension) ||
                        notationMimeTypes.stream().anyMatch(lowerMimeType::contains);
                yield "notation files (MusicXML, XML, MIDI, PDF)";
            }
            case arrangement -> {
                // Cho cả notation và audio
                isValid = notationExtensions.contains(extension) ||
                        notationMimeTypes.stream().anyMatch(lowerMimeType::contains) ||
                        audioExtensions.contains(extension) ||
                        audioMimeTypes.stream().anyMatch(lowerMimeType::contains);
                yield "notation or audio files";
            }
            case recording -> {
                // Chỉ cho audio files
                isValid = audioExtensions.contains(extension) ||
                        audioMimeTypes.stream().anyMatch(lowerMimeType::contains);
                yield "audio files (MP3, WAV, FLAC, etc.)";
            }
            default -> throw InvalidFileTypeForTaskException.unknownTaskType(taskType.name());
        };

        if (!isValid) {
            throw InvalidFileTypeForTaskException.notAllowed(
                fileName,
                taskType.name(),
                allowedTypes
            );
        }
    }

    /**
     * Download file by fileId
     * @param fileId ID của file
     * @param userId ID của user đang request
     * @param userRoles Danh sách roles của user
     * @return byte array của file content
     */
    public byte[] downloadFile(String fileId, String userId, List<String> userRoles) {
        log.info("User {} downloading file with id: {}", userId, fileId);
        
        // Kiểm tra quyền truy cập
        fileAccessService.checkFileAccess(fileId, userId, userRoles);
        
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
        if (file.getFileKeyS3() == null || file.getFileKeyS3().isEmpty()) {
            throw new FileUploadException(
                String.format("File key not found for file id: %s", fileId)
            );
        }
        
        try {
            // Use fileKeyS3 directly (S3 object key)
            return s3Service.downloadFile(file.getFileKeyS3());
        } catch (Exception e) {
            log.error("Error downloading file from S3: {}", e.getMessage(), e);
            throw FileUploadException.failed(
                file.getFileName(),
                "Failed to download file from S3: " + e.getMessage(),
                e
            );
        }
    }

    /**
     * Get file info by fileId
     * @param fileId ID của file
     * @param userId ID của user đang request (optional, nếu null thì không check quyền)
     * @param userRoles Danh sách roles của user (optional)
     * @return FileInfoResponse
     */
    public FileInfoResponse getFileInfo(String fileId, String userId, List<String> userRoles) {
        log.info("User {} getting file info with id: {}", userId, fileId);
        
        // Kiểm tra quyền truy cập nếu có userId
        if (userId != null && userRoles != null) {
            fileAccessService.checkFileAccess(fileId, userId, userRoles);
        }
        
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
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
     * Manager approve file
     * @param fileId ID của file
     * @param userId ID của manager
     * @param userRoles Danh sách roles của user
     * @return FileInfoResponse
     */
    @Transactional
    public FileInfoResponse approveFile(String fileId, String userId, List<String> userRoles) {
        log.info("Manager {} approving file: {}", userId, fileId);
        
        // Kiểm tra quyền truy cập
        fileAccessService.checkFileAccess(fileId, userId, userRoles);
        
        // Verify user is MANAGER
        if (!userRoles.contains("MANAGER") && !userRoles.contains("SYSTEM_ADMIN")) {
            throw UnauthorizedException.create("Only managers can approve files");
        }
        
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
        // Chỉ approve file có status uploaded hoặc pending_review
        if (file.getFileStatus() != FileStatus.uploaded && 
            file.getFileStatus() != FileStatus.pending_review) {
            throw InvalidFileStatusException.cannotApprove(fileId, file.getFileStatus());
        }
        
        file.setFileStatus(FileStatus.approved);
        file.setReviewedBy(userId);
        file.setReviewedAt(Instant.now());
        file.setRejectionReason(null); // Clear rejection reason if any
        
        File saved = fileRepository.save(file);
        log.info("File approved: fileId={}, reviewedBy={}", saved.getFileId(), userId);
        
        return getFileInfo(saved.getFileId(), userId, userRoles);
    }

    /**
     * Manager reject file
     * @param fileId ID của file
     * @param userId ID của manager
     * @param userRoles Danh sách roles của user
     * @param rejectionReason Lý do từ chối
     * @return FileInfoResponse
     */
    @Transactional
    public FileInfoResponse rejectFile(String fileId, String userId, List<String> userRoles, String rejectionReason) {
        log.info("Manager {} rejecting file: {}, reason: {}", userId, fileId, rejectionReason);
        
        // Kiểm tra quyền truy cập
        fileAccessService.checkFileAccess(fileId, userId, userRoles);
        
        // Verify user is MANAGER
        if (!userRoles.contains("MANAGER") && !userRoles.contains("SYSTEM_ADMIN")) {
            throw UnauthorizedException.create("Only managers can reject files");
        }
        
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
        // Chỉ reject file có status uploaded hoặc pending_review
        if (file.getFileStatus() != FileStatus.uploaded && 
            file.getFileStatus() != FileStatus.pending_review) {
            throw InvalidFileStatusException.cannotReject(fileId, file.getFileStatus());
        }
        
        file.setFileStatus(FileStatus.rejected);
        file.setReviewedBy(userId);
        file.setReviewedAt(Instant.now());
        file.setRejectionReason(rejectionReason);
        
        File saved = fileRepository.save(file);
        log.info("File rejected: fileId={}, reviewedBy={}, reason={}", 
                saved.getFileId(), userId, rejectionReason);
        
        return getFileInfo(saved.getFileId(), userId, userRoles);
    }

    /**
     * Specialist soft delete file (chỉ khi fileStatus = uploaded)
     * @param fileId ID của file
     * @param userId ID của specialist
     * @param userRoles Danh sách roles của user
     * @return FileInfoResponse
     */
    @Transactional
    public FileInfoResponse softDeleteFile(String fileId, String userId, List<String> userRoles) {
        log.info("Specialist {} soft deleting file: fileId={}", userId, fileId);
        
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
        // Verify file access first (using FileAccessService logic)
        // This already checks if file belongs to specialist's assignment
        fileAccessService.checkFileAccess(fileId, userId, userRoles);
        
        // Verify file belongs to assignment of current specialist
        if (file.getAssignmentId() != null) {
            TaskAssignment assignment = taskAssignmentRepository.findById(file.getAssignmentId())
                    .orElseThrow(() -> TaskAssignmentNotFoundException.byId(file.getAssignmentId()));
            
            // Double check using specialistUserIdSnapshot (same as FileAccessService)
            // This ensures consistency with access control logic
            String specialistUserId = assignment.getSpecialistUserIdSnapshot() != null 
                    ? assignment.getSpecialistUserIdSnapshot() 
                    : assignment.getSpecialistId();
            
            if (!userId.equals(specialistUserId)) {
                throw UnauthorizedException.create("You can only delete files from your own tasks");
            }
            
            // Only allow delete if assignment is in_progress or revision_requested
            if (assignment.getStatus() != AssignmentStatus.in_progress 
                    && assignment.getStatus() != AssignmentStatus.revision_requested) {
                throw InvalidTaskAssignmentStatusException.cannotDeleteFile(
                    assignment.getAssignmentId(), 
                    assignment.getStatus()
                );
            }
        }
        
        // Only allow delete if fileStatus = uploaded
        if (file.getFileStatus() != FileStatus.uploaded) {
            throw InvalidFileStatusException.cannotDelete(file.getFileId(), file.getFileStatus());
        }
        
        // Soft delete: set status = deleted
        file.setFileStatus(FileStatus.deleted);
        File saved = fileRepository.save(file);
        log.info("File soft deleted: fileId={}, fileName={}", saved.getFileId(), saved.getFileName());
        
        return getFileInfo(saved.getFileId(), userId, userRoles);
    }

}

