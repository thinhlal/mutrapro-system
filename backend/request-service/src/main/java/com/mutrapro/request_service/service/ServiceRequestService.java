package com.mutrapro.request_service.service;

import com.mutrapro.request_service.dto.request.AssignManagerRequest;
import com.mutrapro.request_service.dto.request.CreateServiceRequestRequest;
import com.mutrapro.request_service.dto.response.ServiceRequestResponse;
import com.mutrapro.request_service.entity.NotationInstrument;
import com.mutrapro.request_service.entity.OutboxEvent;
import com.mutrapro.request_service.entity.RequestNotationInstrument;
import com.mutrapro.request_service.entity.ServiceRequest;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.enums.NotationInstrumentUsage;
import com.mutrapro.request_service.exception.CannotAssignToOtherManagerException;
import com.mutrapro.request_service.exception.DurationRequiredException;
import com.mutrapro.request_service.exception.FileRequiredException;
import com.mutrapro.request_service.exception.FileTypeNotSupportedForRequestException;
import com.mutrapro.request_service.exception.InstrumentUsageNotCompatibleException;
import com.mutrapro.request_service.exception.InstrumentsRequiredException;
import com.mutrapro.request_service.exception.NotationInstrumentNotFoundException;
import com.mutrapro.request_service.exception.RequestAlreadyHasManagerException;
import com.mutrapro.request_service.exception.ServiceRequestNotFoundException;
import com.mutrapro.request_service.exception.UserNotAuthenticatedException;
import com.mutrapro.request_service.mapper.ServiceRequestMapper;
import com.mutrapro.request_service.repository.NotationInstrumentRepository;
import com.mutrapro.request_service.repository.OutboxEventRepository;
import com.mutrapro.request_service.repository.ServiceRequestRepository;
import com.mutrapro.shared.event.RequestAssignedEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ServiceRequestService {

    ServiceRequestRepository serviceRequestRepository;
    NotationInstrumentRepository notationInstrumentRepository;
    OutboxEventRepository outboxEventRepository;
    FileUploadService fileUploadService;
    ServiceRequestMapper serviceRequestMapper;
    ObjectMapper objectMapper;
    
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
        
        ServiceType requestType = request.getRequestType();
        
        // Validate transcription-specific requirements and prepare duration
        BigDecimal durationMinutes = request.getDurationMinutes();
        if (requestType == ServiceType.transcription) {
            // Files are required for transcription
            List<MultipartFile> files = request.getFiles();
            if (files == null || files.isEmpty() || files.stream().allMatch(f -> f == null || f.isEmpty())) {
                throw FileRequiredException.create();
            }
            
            // Duration minutes is required for transcription
            if (durationMinutes == null) {
                throw DurationRequiredException.create();
            }
            
            // Duration must be positive
            if (durationMinutes.compareTo(BigDecimal.ZERO) <= 0) {
                throw DurationRequiredException.create();
            }
        }
        
        // Round duration to 2 decimal places if provided and has more than 2 decimal places
        if (durationMinutes != null && durationMinutes.scale() > 2) {
            durationMinutes = durationMinutes.setScale(2, java.math.RoundingMode.HALF_UP);
        }
        
        // Create ServiceRequest entity
        ServiceRequest serviceRequest = ServiceRequest.builder()
                .userId(userId)
                .requestType(request.getRequestType())
                .contactName(request.getContactName())
                .contactPhone(request.getContactPhone())
                .contactEmail(request.getContactEmail())
                .musicOptions(request.getMusicOptions())
                .tempoPercentage(request.getTempoPercentage())
                .durationMinutes(durationMinutes)  // Lưu độ dài audio (phút) - đã làm tròn nếu cần
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
        
        // Build response using MapStruct mapper
        return serviceRequestMapper.toServiceRequestResponse(saved);
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
    
    /**
     * Lấy tất cả service requests với các filter tùy chọn
     * 
     * @param status Filter theo status (optional)
     * @param requestType Filter theo request type (optional)
     * @param managerUserId Filter theo manager user ID (optional)
     * @return Danh sách service requests
     */
    public List<ServiceRequestResponse> getAllServiceRequests(
            RequestStatus status, 
            ServiceType requestType, 
            String managerUserId) {
        List<ServiceRequest> requests;
        
        if (status != null && requestType != null && managerUserId != null) {
            // Filter theo cả 3 tham số
            requests = serviceRequestRepository.findByStatusAndRequestTypeAndManagerUserId(
                    status, requestType, managerUserId);
        } else if (status != null && requestType != null) {
            // Filter theo status và requestType
            requests = serviceRequestRepository.findByStatusAndRequestType(status, requestType);
        } else if (status != null && managerUserId != null) {
            // Filter theo status và managerUserId
            requests = serviceRequestRepository.findByStatusAndManagerUserId(status, managerUserId);
        } else if (requestType != null && managerUserId != null) {
            // Filter theo requestType và managerUserId
            requests = serviceRequestRepository.findByRequestTypeAndManagerUserId(requestType, managerUserId);
        } else if (status != null) {
            // Filter theo status
            requests = serviceRequestRepository.findByStatus(status);
        } else if (requestType != null) {
            // Filter theo requestType
            requests = serviceRequestRepository.findByRequestType(requestType);
        } else if (managerUserId != null) {
            // Filter theo managerUserId
            requests = serviceRequestRepository.findByManagerUserId(managerUserId);
        } else {
            // Lấy tất cả
            requests = serviceRequestRepository.findAll();
        }
        
        log.info("Retrieved {} service requests with filters: status={}, requestType={}, managerUserId={}", 
                requests.size(), status, requestType, managerUserId);
        
        return requests.stream()
                .map(serviceRequestMapper::toServiceRequestResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Lấy danh sách request mà user hiện tại đã tạo
     * @param status Optional filter theo status, nếu null thì lấy tất cả
     * @return Danh sách ServiceRequestResponse
     */
    public List<ServiceRequestResponse> getUserRequests(RequestStatus status) {
        String userId = getCurrentUserId();
        
        List<ServiceRequest> requests;
        if (status != null) {
            requests = serviceRequestRepository.findByUserIdAndStatus(userId, status);
        } else {
            requests = serviceRequestRepository.findByUserId(userId);
        }
        
        log.info("Retrieved {} requests for user: userId={}, status={}", 
                requests.size(), userId, status != null ? status.name() : "all");
        
        return requests.stream()
                .map(serviceRequestMapper::toServiceRequestResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Manager nhận trách nhiệm về service request
     * 
     * @param requestId ID của service request
     * @param assignRequest Request chứa managerId (có thể null để tự nhận)
     * @return ServiceRequestResponse sau khi assign
     */
    @Transactional
    public ServiceRequestResponse assignManager(String requestId, AssignManagerRequest assignRequest) {
        // Tìm service request
        ServiceRequest serviceRequest = serviceRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> ServiceRequestNotFoundException.byId(requestId));
        
        // Lấy user ID hiện tại
        String currentUserId = getCurrentUserId();
        
        // Xác định manager ID
        String managerId;
        if (assignRequest != null && assignRequest.getManagerId() != null 
                && !assignRequest.getManagerId().trim().isEmpty()) {
            // Có managerId trong request - kiểm tra xem có phải là chính mình không
            String requestedManagerId = assignRequest.getManagerId().trim();
            if (!requestedManagerId.equals(currentUserId)) {
                // Manager cố gắng assign cho người khác - không cho phép
                throw CannotAssignToOtherManagerException.create(requestedManagerId, currentUserId);
            }
            managerId = requestedManagerId;
        } else {
            // Manager tự nhận trách nhiệm (sử dụng user hiện tại)
            managerId = currentUserId;
        }
        
        // Kiểm tra xem request đã có manager chưa
        if (serviceRequest.getManagerUserId() != null) {
            // Nếu đã có manager và không phải là manager hiện tại
            if (!serviceRequest.getManagerUserId().equals(managerId)) {
                // Request đã có manager khác - không cho phép reassign
                throw RequestAlreadyHasManagerException.create(requestId, serviceRequest.getManagerUserId());
            }
            // Nếu đã có manager và là chính manager hiện tại - không cần làm gì, chỉ return response
            log.info("Service request {} already assigned to current manager {}", requestId, managerId);
            return serviceRequestMapper.toServiceRequestResponse(serviceRequest);
        }
        
        // Assign manager (request chưa có manager)
        serviceRequest.setManagerUserId(managerId);
        ServiceRequest saved = serviceRequestRepository.save(serviceRequest);
        
        log.info("Assigned manager {} to service request: requestId={}", 
                managerId, requestId);
        
        // Publish RequestAssignedEvent để Chat Service tạo room
        publishRequestAssignedEvent(saved, managerId);
        
        return serviceRequestMapper.toServiceRequestResponse(saved);
    }
    
    /**
     * Publish RequestAssignedEvent khi manager được assign
     * Chat Service sẽ lắng nghe và tự động tạo chat room
     */
    private void publishRequestAssignedEvent(ServiceRequest request, String managerId) {
        try {
            // Create event
            RequestAssignedEvent event = RequestAssignedEvent.builder()
                    .eventId(UUID.randomUUID())
                    .requestId(request.getRequestId())
                    .title(request.getTitle())
                    .ownerId(request.getUserId())  // customer userId
                    .ownerName(null)  // Chat Service sẽ fetch từ Identity Service nếu cần
                    .managerId(managerId)
                    .managerName(null)  // Chat Service sẽ fetch từ Identity Service nếu cần
                    .timestamp(Instant.now())
                    .build();
            
            // Save to outbox for guaranteed delivery
            var eventPayload = objectMapper.valueToTree(event);
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateType("ServiceRequest")
                    .aggregateId(UUID.randomUUID())  // Generate new UUID for outbox
                    .eventType("request.assigned")
                    .eventPayload(eventPayload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            
            log.info("RequestAssignedEvent saved to outbox: requestId={}, managerId={}", 
                    request.getRequestId(), managerId);
            
        } catch (Exception e) {
            log.error("Failed to publish RequestAssignedEvent: requestId={}, error={}", 
                    request.getRequestId(), e.getMessage(), e);
            // Không throw exception - request đã assign thành công
            // Event sẽ được retry hoặc có thể tạo room thủ công
        }
    }
    
}

