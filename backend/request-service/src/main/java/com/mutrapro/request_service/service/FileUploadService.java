package com.mutrapro.request_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.request_service.entity.OutboxEvent;
import com.mutrapro.shared.event.FileUploadedEvent;
import com.mutrapro.request_service.exception.FileReadException;
import com.mutrapro.request_service.exception.FileRequiredException;
import com.mutrapro.request_service.exception.FileSizeExceededException;
import com.mutrapro.request_service.exception.FileTypeNotAllowedException;
import com.mutrapro.request_service.exception.FileUploadFailedException;
import com.mutrapro.request_service.exception.UserNotAuthenticatedException;
import com.mutrapro.request_service.repository.OutboxEventRepository;
import com.mutrapro.shared.service.S3Service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Transactional
public class FileUploadService {

    S3Service s3Service;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;
    
    @NonFinal
    @Value("${file.upload.max-size}")
    Long maxFileSize;

    @NonFinal
    @Value("${file.upload.allowed-audio-types}")
    String allowedAudioTypes;
    
    @NonFinal
    @Value("${file.upload.allowed-sheet-music-types}")
    String allowedSheetMusicTypes;

    /**
     * Upload audio file (for transcription or reference)
     */
    public void uploadAudioFile(MultipartFile file, String requestId) {
        validateAudioFile(file);
        uploadFile(file, requestId, "audio", "audio");
    }
    
    /**
     * Upload sheet music file (PDF, MusicXML, MIDI for arrangement)
     */
    public void uploadSheetMusicFile(MultipartFile file, String requestId) {
        validateSheetMusicFile(file);
        uploadFile(file, requestId, "sheet_music", "sheet-music");
    }
    
    /**
     * Generic file upload method
     * @param file file to upload
     * @param requestId service request ID
     * @param contentType content type enum value (audio, sheet_music, etc.)
     * @param folderPrefix S3 folder prefix (audio, sheet-music, etc.)
     */
    private void uploadFile(MultipartFile file, String requestId, String contentType, String folderPrefix) {
        String userId = getCurrentUserId();
        
        try {
            // Upload to S3 (private file, not public)
            String s3Url = s3Service.uploadFile(
                    file.getInputStream(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    folderPrefix,
                    false  // isPublic = false for customer uploads
            );
            
            // file_id sẽ được project-service generate khi tạo file record
            UUID eventId = UUID.randomUUID();
            FileUploadedEvent fileEvent = FileUploadedEvent.builder()
                    .eventId(eventId)  // Dùng làm idempotency key
                    .fileName(file.getOriginalFilename())
                    .filePath(s3Url)
                    .fileSize(file.getSize())
                    .mimeType(file.getContentType())
                    .fileSource("customer_upload")  // file_source_type enum
                    .contentType(contentType)  // content_type enum: audio, sheet_music, etc.
                    .description(String.format("%s file uploaded by customer", contentType))
                    .uploadDate(Instant.now())
                    .createdBy(userId)
                    .requestId(requestId)  // Link với service request
                    .assignmentId(null)  // null vì chưa có assignment
                    .bookingId(null)  // null vì chưa có booking
                    .build();
            
            // Save event to outbox
            // aggregateType là "service-request" vì đây là luồng phụ trong service request
            var eventPayload = objectMapper.valueToTree(fileEvent);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(UUID.fromString(requestId))  // requestId is UUID string format
                    .aggregateType("service-request")
                    .eventType("file.uploaded")
                    .eventPayload(eventPayload)
                    .occurredAt(Instant.now())
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("File uploaded to S3 and event saved to outbox: contentType={}, s3Url={}, outboxId={}", 
                    contentType, s3Url, outboxEvent.getOutboxId());
        } catch (IOException e) {
            log.error("Error reading file: {}", e.getMessage(), e);
            throw FileReadException.create(e.getMessage(), e);
        } catch (Exception e) {
            log.error("Error uploading file: {}", e.getMessage(), e);
            throw FileUploadFailedException.create(e.getMessage(), e);
        }
    }

    private void validateAudioFile(MultipartFile file) {
        validateFile(file, allowedAudioTypes, "audio");
    }
    
    private void validateSheetMusicFile(MultipartFile file) {
        validateFile(file, allowedSheetMusicTypes, "sheet music");
    }
    
    private void validateFile(MultipartFile file, String allowedTypesConfig, String fileTypeName) {
        if (file == null || file.isEmpty()) {
            throw FileRequiredException.create();
        }
        
        if (file.getSize() > maxFileSize) {
            throw FileSizeExceededException.create(maxFileSize / 1024 / 1024);
        }
        
        String contentType = file.getContentType();
        List<String> allowedTypes = Arrays.asList(allowedTypesConfig.split(","));
        
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw FileTypeNotAllowedException.create(contentType, allowedTypesConfig);
        }
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            // Get userId from claim (preferred) or fallback to subject (email) for backward compatibility
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            // Fallback: if userId claim is not present, use subject (should not happen with new tokens)
            log.warn("userId claim not found in JWT, falling back to subject. Token may be outdated.");
            return jwt.getSubject();
        }
        throw UserNotAuthenticatedException.create();
    }
}

