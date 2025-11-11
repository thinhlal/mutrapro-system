package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.FileInfoResponse;
import com.mutrapro.project_service.entity.File;
import com.mutrapro.project_service.enums.ContentType;
import com.mutrapro.project_service.enums.FileSourceType;
import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.repository.FileRepository;
import com.mutrapro.shared.event.FileUploadedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FileService {

    FileRepository fileRepository;

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
                        .fileId(f.getFileId().toString())
                        .fileName(f.getFileName())
                        .filePath(f.getFilePath())
                        .fileSize(f.getFileSize())
                        .mimeType(f.getMimeType())
                        .contentType(f.getContentType() != null ? f.getContentType().name() : null)
                        .uploadDate(f.getUploadDate())
                        .build())
                .collect(Collectors.toList());
    }
}

