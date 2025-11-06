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

    public void uploadAudioFile(MultipartFile file, String requestId) {
        validateFile(file);
        
        String userId = getCurrentUserId();
        
        try {
            // Upload to S3
            String s3Url = s3Service.uploadFile(
                    file.getInputStream(),
                    file.getOriginalFilename(),
                    file.getContentType(),
                    file.getSize(),
                    "audio"  // folder prefix
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
                    .contentType("audio")  // content_type enum
                    .description("Audio file uploaded by customer")
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
                    .aggregateId(UUID.fromString(requestId))
                    .aggregateType("service-request")
                    .eventType("file.uploaded")
                    .eventPayload(eventPayload)
                    .occurredAt(Instant.now())
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.info("File uploaded to S3 and event saved to outbox: s3Url={}, outboxId={}", s3Url, outboxEvent.getOutboxId());
        } catch (IOException e) {
            log.error("Error reading file: {}", e.getMessage(), e);
            throw FileReadException.create(e.getMessage(), e);
        } catch (Exception e) {
            log.error("Error uploading file: {}", e.getMessage(), e);
            throw FileUploadFailedException.create(e.getMessage(), e);
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw FileRequiredException.create();
        }
        
        if (file.getSize() > maxFileSize) {
            throw FileSizeExceededException.create(maxFileSize / 1024 / 1024);
        }
        
        String contentType = file.getContentType();
        List<String> allowedTypes = Arrays.asList(allowedAudioTypes.split(","));
        
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw FileTypeNotAllowedException.create(contentType, allowedAudioTypes);
        }
    }

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        throw UserNotAuthenticatedException.create();
    }
}

