package com.mutrapro.request_service.service;

import com.mutrapro.request_service.dto.request.CreateNotationInstrumentRequest;
import com.mutrapro.request_service.dto.request.UpdateNotationInstrumentRequest;
import com.mutrapro.request_service.entity.NotationInstrument;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import com.mutrapro.request_service.repository.NotationInstrumentRepository;
import com.mutrapro.request_service.dto.response.NotationInstrumentResponse;
import com.mutrapro.request_service.exception.FileRequiredException;
import com.mutrapro.request_service.exception.FileSizeExceededException;
import com.mutrapro.request_service.exception.FileTypeNotAllowedException;
import com.mutrapro.request_service.exception.NotationInstrumentDuplicateException;
import com.mutrapro.request_service.exception.NotationInstrumentNotFoundException;
import com.mutrapro.shared.service.S3Service;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotationInstrumentService {

    NotationInstrumentRepository notationInstrumentRepository;
    S3Service s3Service;
    
    @NonFinal
    @Value("${file.upload.max-size:104857600}")
    Long maxFileSize;
    
    @NonFinal
    @Value("${file.upload.allowed-image-types:image/jpeg,image/jpg,image/png}")
    String allowedImageTypes;

    public List<NotationInstrumentResponse> getInstruments(NotationInstrumentUsage usage, boolean includeInactive) {
        List<NotationInstrument> instruments;
        
        if (usage == null) {
            if (includeInactive) {
                log.debug("Fetching all notation instruments (including inactive)");
                instruments = notationInstrumentRepository.findAll();
            } else {
                log.debug("Fetching all active notation instruments");
                instruments = notationInstrumentRepository.findByIsActiveTrue();
            }
        } else {
            List<NotationInstrumentUsage> usagesToQuery;
            switch (usage) {
                case transcription:
                    // transcription + both (vì both cũng hỗ trợ transcription)
                    usagesToQuery = List.of(NotationInstrumentUsage.transcription, NotationInstrumentUsage.both);
                    break;
                case arrangement:
                    // arrangement + both (vì both cũng hỗ trợ arrangement)
                    usagesToQuery = List.of(NotationInstrumentUsage.arrangement, NotationInstrumentUsage.both);
                    break;
                case both:
                    // both lấy tất cả (transcription, arrangement, both)
                    usagesToQuery = List.of(
                            NotationInstrumentUsage.transcription,
                            NotationInstrumentUsage.arrangement,
                            NotationInstrumentUsage.both
                    );
                    break;
                default:
                    usagesToQuery = List.of(usage);
            }
            
            if (includeInactive) {
                log.debug("Fetching all notation instruments (including inactive) for usage: {} (querying: {})", usage, usagesToQuery);
                instruments = notationInstrumentRepository.findByUsageIn(usagesToQuery);
            } else {
                log.debug("Fetching active notation instruments for usage: {} (querying: {})", usage, usagesToQuery);
                instruments = notationInstrumentRepository.findByIsActiveTrueAndUsageIn(usagesToQuery);
            }
        }
        
        return instruments.stream()
                .map(e -> NotationInstrumentResponse.builder()
                        .instrumentId(e.getInstrumentId())
                        .instrumentName(e.getInstrumentName())
                        .usage(e.getUsage())
                        .basePrice(e.getBasePrice())
                        .isActive(e.isActive())
                        .image(e.getImage())
                        .build())
                        .collect(Collectors.toList());
    }

    /**
     * Lấy danh sách instruments theo list IDs
     * @param instrumentIds danh sách IDs
     * @return List<NotationInstrumentResponse>
     */
    public List<NotationInstrumentResponse> getInstrumentsByIds(List<String> instrumentIds) {
        if (instrumentIds == null || instrumentIds.isEmpty()) {
            log.debug("Empty instrument IDs list, returning empty list");
            return List.of();
        }
        
        log.debug("Fetching instruments by IDs: {}", instrumentIds);
        List<NotationInstrument> instruments = notationInstrumentRepository.findByInstrumentIdIn(instrumentIds);
        
        return instruments.stream()
                .map(e -> NotationInstrumentResponse.builder()
                        .instrumentId(e.getInstrumentId())
                        .instrumentName(e.getInstrumentName())
                        .usage(e.getUsage())
                        .basePrice(e.getBasePrice())
                        .isActive(e.isActive())
                        .image(e.getImage())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public NotationInstrumentResponse createInstrument(CreateNotationInstrumentRequest request) {
        // Check if instrument name already exists (case-insensitive)
        notationInstrumentRepository.findByInstrumentNameIgnoreCase(request.getInstrumentName())
                .ifPresent(existing -> {
                    throw NotationInstrumentDuplicateException.create(request.getInstrumentName());
                });
        
        // Create new instrument
        NotationInstrument instrument = NotationInstrument.builder()
                .instrumentName(request.getInstrumentName())
                .usage(request.getUsage())
                .basePrice(request.getBasePrice() != null ? request.getBasePrice() : 0L)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        
        // Upload image if provided
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            validateImageFile(request.getImage());
            try {
                // Upload with public-read ACL so images can be accessed directly
                String s3Url = s3Service.uploadFile(
                        request.getImage().getInputStream(),
                        request.getImage().getOriginalFilename(),
                        request.getImage().getContentType(),
                        request.getImage().getSize(),
                        "instruments",
                        true  // isPublic = true for instrument images
                );
                instrument.setImage(s3Url);
            } catch (IOException e) {
                log.error("Error reading image file: {}", e.getMessage(), e);
                throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
            }
        }
        
        NotationInstrument saved = notationInstrumentRepository.save(instrument);
        log.info("Created new instrument: instrumentId={}, instrumentName={}", saved.getInstrumentId(), saved.getInstrumentName());
        
        return NotationInstrumentResponse.builder()
                .instrumentId(saved.getInstrumentId())
                .instrumentName(saved.getInstrumentName())
                .usage(saved.getUsage())
                .basePrice(saved.getBasePrice())
                .isActive(saved.isActive())
                .image(saved.getImage())
                .build();
    }

    @Transactional
    public String uploadImage(String instrumentId, MultipartFile imageFile) {
        // Find instrument
        NotationInstrument instrument = notationInstrumentRepository.findById(instrumentId)
                .orElseThrow(() -> NotationInstrumentNotFoundException.byId(instrumentId));
        
        // Validate image file
        validateImageFile(imageFile);
        
        try {
            // Upload to S3 with public-read ACL so images can be accessed directly
            String s3Url = s3Service.uploadFile(
                    imageFile.getInputStream(),
                    imageFile.getOriginalFilename(),
                    imageFile.getContentType(),
                    imageFile.getSize(),
                    "instruments",  // folder prefix
                    true  // isPublic = true for instrument images
            );
            
            // Update instrument image URL
            instrument.setImage(s3Url);
            notationInstrumentRepository.save(instrument);
            
            log.info("Image uploaded and updated for instrument: instrumentId={}, imageUrl={}", 
                    instrumentId, s3Url);
            return s3Url;
        } catch (IOException e) {
            log.error("Error reading image file: {}", e.getMessage(), e);
            throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
        }
    }

    @Transactional
    public NotationInstrumentResponse updateInstrument(String instrumentId, UpdateNotationInstrumentRequest request) {
        // Find instrument
        NotationInstrument instrument = notationInstrumentRepository.findById(instrumentId)
                .orElseThrow(() -> NotationInstrumentNotFoundException.byId(instrumentId));
        
        // Update instrumentName if provided
        if (request.getInstrumentName() != null && !request.getInstrumentName().trim().isEmpty()) {
            // Check if new name already exists (excluding current instrument)
            notationInstrumentRepository.findByInstrumentNameIgnoreCase(request.getInstrumentName())
                    .ifPresent(existing -> {
                        // Only throw error if it's a different instrument
                        if (!existing.getInstrumentId().equals(instrumentId)) {
                            throw NotationInstrumentDuplicateException.create(request.getInstrumentName());
                        }
                    });
            instrument.setInstrumentName(request.getInstrumentName().trim());
        }
        
        // Update usage if provided
        if (request.getUsage() != null) {
            instrument.setUsage(request.getUsage());
        }
        
        // Update basePrice if provided
        if (request.getBasePrice() != null) {
            instrument.setBasePrice(request.getBasePrice());
        }
        
        // Update isActive if provided
        if (request.getIsActive() != null) {
            instrument.setActive(request.getIsActive());
        }
        
        // Update image if provided
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            validateImageFile(request.getImage());
            try {
                // Upload new image with public-read ACL
                String s3Url = s3Service.uploadFile(
                        request.getImage().getInputStream(),
                        request.getImage().getOriginalFilename(),
                        request.getImage().getContentType(),
                        request.getImage().getSize(),
                        "instruments",
                        true  // isPublic = true for instrument images
                );
                instrument.setImage(s3Url);
                log.info("Image updated for instrument: instrumentId={}, newImageUrl={}", instrumentId, s3Url);
            } catch (IOException e) {
                log.error("Error reading image file during update: {}", e.getMessage(), e);
                throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
            }
        }
        
        NotationInstrument saved = notationInstrumentRepository.save(instrument);
        log.info("Updated instrument: instrumentId={}, instrumentName={}", saved.getInstrumentId(), saved.getInstrumentName());
        
        return NotationInstrumentResponse.builder()
                .instrumentId(saved.getInstrumentId())
                .instrumentName(saved.getInstrumentName())
                .usage(saved.getUsage())
                .basePrice(saved.getBasePrice())
                .isActive(saved.isActive())
                .image(saved.getImage())
                .build();
    }

    private void validateImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw FileRequiredException.create();
        }
        
        if (file.getSize() > maxFileSize) {
            throw FileSizeExceededException.create(maxFileSize / 1024 / 1024);
        }
        
        String contentType = file.getContentType();
        List<String> allowedTypes = Arrays.asList(allowedImageTypes.split(","));
        
        if (contentType == null || !allowedTypes.contains(contentType)) {
            throw FileTypeNotAllowedException.create(contentType, allowedImageTypes);
        }
    }
}


