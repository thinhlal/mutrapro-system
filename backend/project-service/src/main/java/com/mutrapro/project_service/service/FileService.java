package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.ContentType;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.exception.FileNotFoundException;
import com.mutrapro.project_service.exception.FileUploadException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.shared.event.FileUploadedEvent;
import com.mutrapro.shared.exception.BusinessException;
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

    @Transactional
    public File createFileFromEvent(FileUploadedEvent event) {
        // Idempotency is handled at consumer level (BaseIdempotentConsumer with consumed_events table)
        // This method is only called if the event hasn't been processed before
        
        // Convert event to File entity
        File file = File.builder()
                .fileName(event.getFileName())
                .filePath(event.getFilePath())
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
        
        return saved;
    }

    public List<FileInfoResponse> getFilesByRequestId(String requestId) {
        List<File> files = fileRepository.findByRequestId(requestId);
            return files.stream()
                .map(f -> FileInfoResponse.builder()
                        .fileId(f.getFileId())
                        .fileName(f.getFileName())
                        .filePath(f.getFilePath())
                        .fileSize(f.getFileSize())
                        .mimeType(f.getMimeType())
                        .contentType(f.getContentType() != null ? f.getContentType().name() : null)
                        .fileSource(f.getFileSource())  // Thêm fileSource vào response
                        .description(f.getDescription())
                        .uploadDate(f.getUploadDate())
                        .fileStatus(f.getFileStatus() != null ? f.getFileStatus().name() : null)
                        .deliveredToCustomer(f.getDeliveredToCustomer())
                        .deliveredAt(f.getDeliveredAt())
                        .reviewedAt(f.getReviewedAt())
                        .build())
                .collect(Collectors.toList());
    }

    public List<FileInfoResponse> getFilesByAssignmentId(String assignmentId) {
        if (assignmentId == null || assignmentId.trim().isEmpty()) {
            log.warn("AssignmentId is null or empty");
            return List.of();
        }
        
        try {
            List<File> files = fileRepository.findByAssignmentId(assignmentId);
            return files.stream()
                    .map(f -> FileInfoResponse.builder()
                            .fileId(f.getFileId())
                            .fileName(f.getFileName())
                            .filePath(f.getFilePath())
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
            throw new BusinessException(
                ProjectServiceErrorCodes.FILE_EMPTY,
                "File is empty"
            );
        }
        
        // Validate file type based on task type
        validateFileTypeForTask(assignment.getTaskType(), file.getOriginalFilename(), file.getContentType());
        
        // Get requestId from contract
        String requestId = null;
        if (assignment.getContractId() != null) {
            Contract contract = contractRepository.findById(assignment.getContractId()).orElse(null);
            if (contract != null) {
                requestId = contract.getRequestId();
            }
        }
        
        try {
            // Upload to S3
            String s3Url = s3Service.uploadFile(
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
            
            // Save file metadata
            File fileEntity = File.builder()
                    .fileName(file.getOriginalFilename())
                    .filePath(s3Url)
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType())
                    .fileSource(FileSourceType.specialist_output)
                    .contentType(contentType)
                    .description(description)
                    .uploadDate(Instant.now())
                    .createdBy(userId)
                    .assignmentId(assignmentId)
                    .requestId(requestId)
                    .fileStatus(FileStatus.uploaded)  // Chờ manager review
                    .deliveredToCustomer(false)
                    .build();
            
            File saved = fileRepository.save(fileEntity);
            log.info("File uploaded successfully: fileId={}, assignmentId={}, fileName={}", 
                    saved.getFileId(), assignmentId, file.getOriginalFilename());
            
            return FileInfoResponse.builder()
                    .fileId(saved.getFileId())
                    .fileName(saved.getFileName())
                    .filePath(saved.getFilePath())
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
            throw new BusinessException(
                ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK,
                "Task type is required for file validation"
            );
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

        boolean isValid = false;
        String allowedTypes = "";

        switch (taskType) {
            case transcription:
                // Chỉ cho notation files
                isValid = notationExtensions.contains(extension) || 
                         notationMimeTypes.stream().anyMatch(lowerMimeType::contains);
                allowedTypes = "notation files (MusicXML, XML, MIDI, PDF)";
                break;
                
            case arrangement:
                // Cho cả notation và audio
                isValid = notationExtensions.contains(extension) || 
                         notationMimeTypes.stream().anyMatch(lowerMimeType::contains) ||
                         audioExtensions.contains(extension) ||
                         audioMimeTypes.stream().anyMatch(lowerMimeType::contains);
                allowedTypes = "notation or audio files";
                break;
                
            case recording:
                // Chỉ cho audio files
                isValid = audioExtensions.contains(extension) ||
                         audioMimeTypes.stream().anyMatch(lowerMimeType::contains);
                allowedTypes = "audio files (MP3, WAV, FLAC, etc.)";
                break;
                
            default:
                throw new BusinessException(
                    ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK,
                    String.format("Unknown task type: %s", taskType)
                );
        }

        if (!isValid) {
            throw new BusinessException(
                ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK,
                String.format(
                    "File type '%s' is not allowed for task type '%s'. Only %s are allowed.",
                    fileName, taskType.name(), allowedTypes
                )
            );
        }
    }

    /**
     * Download file by fileId
     * @param fileId ID của file
     * @return byte array của file content
     */
    public byte[] downloadFile(String fileId) {
        log.info("Downloading file with id: {}", fileId);
        
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
        if (file.getFilePath() == null || file.getFilePath().isEmpty()) {
            throw new FileUploadException(
                String.format("File path not found for file id: %s", fileId)
            );
        }
        
        try {
            // Extract S3 key from URL or use filePath directly
            return s3Service.downloadFileFromUrl(file.getFilePath());
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
     * @return FileInfoResponse
     */
    public FileInfoResponse getFileInfo(String fileId) {
        log.info("Getting file info with id: {}", fileId);
        
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> FileNotFoundException.byId(fileId));
        
        return FileInfoResponse.builder()
                .fileId(file.getFileId())
                .fileName(file.getFileName())
                .filePath(file.getFilePath())
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
                .build();
    }
}

