package com.mutrapro.request_service.service;

import com.mutrapro.request_service.dto.request.CreateServiceRequestRequest;
import com.mutrapro.request_service.dto.response.ServiceRequestResponse;
import com.mutrapro.request_service.entity.NotationInstrument;
import com.mutrapro.request_service.entity.RequestNotationInstrument;
import com.mutrapro.request_service.entity.ServiceRequest;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import com.mutrapro.request_service.exception.FileTypeNotSupportedForRequestException;
import com.mutrapro.request_service.exception.InstrumentUsageNotCompatibleException;
import com.mutrapro.request_service.exception.InstrumentsRequiredException;
import com.mutrapro.request_service.exception.NotationInstrumentNotFoundException;
import com.mutrapro.request_service.exception.UserNotAuthenticatedException;
import com.mutrapro.request_service.repository.NotationInstrumentRepository;
import com.mutrapro.request_service.repository.ServiceRequestRepository;
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

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ServiceRequestService {

    ServiceRequestRepository serviceRequestRepository;
    NotationInstrumentRepository notationInstrumentRepository;
    FileUploadService fileUploadService;
    
    @NonFinal
    @Value("${file.upload.allowed-audio-types}")
    String allowedAudioTypes;
    
    @NonFinal
    @Value("${file.upload.allowed-sheet-music-types}")
    String allowedSheetMusicTypes;

    @Transactional
    public ServiceRequestResponse createServiceRequest(CreateServiceRequestRequest request) {
        // Get current authenticated user
        String userId = getCurrentUserId();
        
        // Create ServiceRequest entity
        ServiceRequest serviceRequest = ServiceRequest.builder()
                .userId(userId)
                .requestType(request.getRequestType())
                .contactName(request.getContactName())
                .contactPhone(request.getContactPhone())
                .contactEmail(request.getContactEmail())
                .musicOptions(request.getMusicOptions())
                .tempoPercentage(request.getTempoPercentage())
                .hasVocalist(request.getHasVocalist() != null ? request.getHasVocalist() : false)
                .externalGuestCount(request.getExternalGuestCount() != null ? request.getExternalGuestCount() : 0)
                .title(request.getTitle())
                .description(request.getDescription())
                .status(RequestStatus.pending)
                .build();
        
        ServiceRequest saved = serviceRequestRepository.save(serviceRequest);
        log.info("Created service request: requestId={}, userId={}, requestType={}", 
                saved.getRequestId(), saved.getUserId(), saved.getRequestType());
        
        // Upload files if provided (validate and upload based on request type)
        List<MultipartFile> files = request.getFiles();
        if (files != null && !files.isEmpty()) {
            String requestIdStr = saved.getRequestId();
            ServiceType requestType = request.getRequestType();
            
            // Validate all files first before uploading
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                
                String contentType = file.getContentType();
                if (contentType == null) {
                    throw FileTypeNotSupportedForRequestException.create(
                            file.getOriginalFilename(), 
                            "unknown", 
                            requestType.name(),
                            getSupportedFileTypesForRequestType(requestType));
                }
                
                // Validate file type compatibility with request type
                validateFileTypeForRequest(file, contentType, requestType);
            }
            
            // If all files are valid, upload them
            for (MultipartFile file : files) {
                if (file == null || file.isEmpty()) {
                    continue;
                }
                
                String contentType = file.getContentType();
                
                // Determine file type and upload
                if (isAudioFile(contentType)) {
                    fileUploadService.uploadAudioFile(file, requestIdStr);
                    log.info("Audio file uploaded for request: requestId={}, fileName={}", 
                            saved.getRequestId(), file.getOriginalFilename());
                } else if (isSheetMusicFile(contentType)) {
                    fileUploadService.uploadSheetMusicFile(file, requestIdStr);
                    log.info("Sheet music file uploaded for request: requestId={}, fileName={}", 
                            saved.getRequestId(), file.getOriginalFilename());
                }
            }
        }
        
        // Validate and save selected instruments
        List<String> instrumentIds = request.getInstrumentIds();
        ServiceType requestType = request.getRequestType();
        
        // Transcription and Arrangement require at least one instrument
        if (requestType == ServiceType.transcription || requestType == ServiceType.arrangement) {
            if (instrumentIds == null || instrumentIds.isEmpty()) {
                throw InstrumentsRequiredException.create(requestType.name());
            }
        }
        
        if (instrumentIds != null && !instrumentIds.isEmpty()) {
            // Validate that all instruments exist and get entities
            List<NotationInstrument> instruments = instrumentIds.stream()
                    .map(instrumentId -> notationInstrumentRepository.findById(instrumentId)
                            .orElseThrow(() -> NotationInstrumentNotFoundException.byId(instrumentId)))
                    .collect(Collectors.toList());
            
            // Validate instrument usage compatibility with request type
            for (NotationInstrument instrument : instruments) {
                NotationInstrumentUsage instrumentUsage = instrument.getUsage();
                boolean isCompatible = false;
                
                if (requestType == ServiceType.transcription) {
                    // Transcription: chỉ chấp nhận instruments với usage = transcription hoặc both
                    isCompatible = instrumentUsage == NotationInstrumentUsage.transcription 
                                 || instrumentUsage == NotationInstrumentUsage.both;
                } else if (requestType == ServiceType.arrangement || 
                          requestType == ServiceType.arrangement_with_recording) {
                    // Arrangement: chỉ chấp nhận instruments với usage = arrangement hoặc both
                    isCompatible = instrumentUsage == NotationInstrumentUsage.arrangement 
                                 || instrumentUsage == NotationInstrumentUsage.both;
                } else {
                    // Recording không cần instruments
                    isCompatible = true;
                }
                
                if (!isCompatible) {
                    throw InstrumentUsageNotCompatibleException.create(
                            instrument.getInstrumentName(), 
                            instrumentUsage.name(), 
                            requestType.name());
                }
            }
            
            // Create RequestNotationInstrument records with JPA relationships
            List<RequestNotationInstrument> requestInstruments = instruments.stream()
                    .map(instrument -> RequestNotationInstrument.builder()
                            .serviceRequest(saved)
                            .notationInstrument(instrument)
                            .build())
                    .collect(Collectors.toList());
            
            // Add to ServiceRequest's collection (bidirectional relationship)
            saved.getNotationInstruments().addAll(requestInstruments);
            serviceRequestRepository.save(saved);
            
            log.info("Saved {} instrument selections for request: {}", 
                    requestInstruments.size(), saved.getRequestId());
        }
        
        // Build response - get instrument IDs from the managed entity
        // Note: In same transaction, collection is already populated after save
        List<String> savedInstrumentIds = saved.getNotationInstruments().stream()
                .map(req -> req.getNotationInstrument().getInstrumentId())
                .collect(Collectors.toList());
        
        return ServiceRequestResponse.builder()
                .requestId(saved.getRequestId())
                .userId(saved.getUserId())
                .managerUserId(saved.getManagerUserId())
                .requestType(saved.getRequestType())
                .contactName(saved.getContactName())
                .contactPhone(saved.getContactPhone())
                .contactEmail(saved.getContactEmail())
                .musicOptions(saved.getMusicOptions())
                .tempoPercentage(saved.getTempoPercentage())
                .hasVocalist(saved.getHasVocalist())
                .externalGuestCount(saved.getExternalGuestCount())
                .title(saved.getTitle())
                .description(saved.getDescription())
                .status(saved.getStatus())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .instrumentIds(savedInstrumentIds)
                .build();
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
    
    private boolean isAudioFile(String contentType) {
        if (contentType == null) {
            return false;
        }
        List<String> allowedTypes = Arrays.stream(allowedAudioTypes.split(","))
                .map(String::trim)
                .toList();
        return allowedTypes.contains(contentType);
    }
    
    private boolean isSheetMusicFile(String contentType) {
        if (contentType == null) {
            return false;
        }
        List<String> allowedTypes = Arrays.stream(allowedSheetMusicTypes.split(","))
                .map(String::trim)
                .toList();
        return allowedTypes.contains(contentType);
    }
    
    /**
     * Validate file type compatibility with request type
     */
    private void validateFileTypeForRequest(MultipartFile file, String contentType, ServiceType requestType) {
        boolean isAudio = isAudioFile(contentType);
        boolean isSheetMusic = isSheetMusicFile(contentType);
        
        if (isAudio) {
            // Audio files: allowed for transcription, arrangement, arrangement_with_recording
            if (requestType != ServiceType.transcription && 
                requestType != ServiceType.arrangement &&
                requestType != ServiceType.arrangement_with_recording) {
                throw FileTypeNotSupportedForRequestException.create(
                        file.getOriginalFilename(),
                        contentType,
                        requestType.name(),
                        getSupportedFileTypesForRequestType(requestType));
            }
        } else if (isSheetMusic) {
            // Sheet music files: allowed for arrangement, arrangement_with_recording
            if (requestType != ServiceType.arrangement &&
                requestType != ServiceType.arrangement_with_recording) {
                throw FileTypeNotSupportedForRequestException.create(
                        file.getOriginalFilename(),
                        contentType,
                        requestType.name(),
                        getSupportedFileTypesForRequestType(requestType));
            }
        } else {
            // Unknown/unsupported file type
            throw FileTypeNotSupportedForRequestException.create(
                    file.getOriginalFilename(),
                    contentType,
                    requestType.name(),
                    getSupportedFileTypesForRequestType(requestType));
        }
    }
    
    /**
     * Get supported file types description for request type
     */
    private String getSupportedFileTypesForRequestType(ServiceType requestType) {
        return switch (requestType) {
            case transcription -> "audio files (MP3, WAV, M4A, etc.)";
            case arrangement -> "audio files (MP3, WAV, M4A, etc.) or sheet music files (PDF, MusicXML, MIDI)";
            case arrangement_with_recording -> "audio files (MP3, WAV, M4A, etc.) or sheet music files (PDF, MusicXML, MIDI)";
            case recording -> "no files required";
        };
    }
    
}

