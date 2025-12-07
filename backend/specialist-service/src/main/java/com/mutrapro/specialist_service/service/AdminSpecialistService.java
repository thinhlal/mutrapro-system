package com.mutrapro.specialist_service.service;

import com.mutrapro.shared.enums.Role;
import com.mutrapro.specialist_service.client.IdentityServiceFeignClient;
import com.mutrapro.specialist_service.dto.request.CreateSpecialistRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSpecialistSettingsRequest;
import com.mutrapro.specialist_service.dto.request.UpdateSpecialistStatusRequest;
import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.SpecialistAlreadyExistsException;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.exception.UserNotFoundException;
import com.mutrapro.specialist_service.exception.InvalidSpecialistRequestException;
import com.mutrapro.specialist_service.exception.UserRoleUpdateException;
import com.mutrapro.specialist_service.mapper.SpecialistMapper;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service cho Admin quản lý specialist
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSpecialistService {
    
    private final SpecialistRepository specialistRepository;
    private final SpecialistMapper specialistMapper;
    private final IdentityServiceFeignClient identityServiceFeignClient;
    
    /**
     * Tạo specialist mới từ user (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SpecialistResponse createSpecialist(CreateSpecialistRequest request) {
        String email = request.getEmail().trim();
        log.info("Creating specialist for user email: {}", email);
        
        // Tìm user theo email để lấy userId
        String userId;
        String normalizedEmail = email;
        String fullNameSnapshot = null;
        try {
            var userResponse = identityServiceFeignClient.getUserByEmail(email);
            if (userResponse.getData() == null || userResponse.getData().getUserId() == null) {
                throw UserNotFoundException.byEmail(email);
            }
            userId = userResponse.getData().getUserId();
            if (userResponse.getData().getEmail() != null) {
                normalizedEmail = userResponse.getData().getEmail();
            }
            fullNameSnapshot = userResponse.getData().getFullName();
            log.info("Found user ID: {} for email: {}", userId, email);
        } catch (UserNotFoundException e) {
            throw e; // Re-throw nếu đã là UserNotFoundException
        } catch (Exception e) {
            log.error("Failed to find user by email: {}", email, e);
            throw UserNotFoundException.byEmail(email, e);
        }
        
        // Kiểm tra xem user đã có specialist chưa
        if (specialistRepository.existsByUserId(userId)) {
            throw SpecialistAlreadyExistsException.byUserId(userId);
        }
        
        // Validate: Nếu là RECORDING_ARTIST thì recordingRoles là bắt buộc
        if (request.getSpecialization() == SpecialistType.RECORDING_ARTIST) {
            if (request.getRecordingRoles() == null || request.getRecordingRoles().isEmpty()) {
                throw InvalidSpecialistRequestException.recordingRolesRequired();
            }
        }
        
        // Tạo specialist entity
        Specialist specialist = specialistMapper.toSpecialist(request);
        specialist.setUserId(userId);
        specialist.setStatus(SpecialistStatus.ACTIVE);
        specialist.setFullNameSnapshot(fullNameSnapshot);
        specialist.setEmailSnapshot(normalizedEmail);
        
        // recordingRoles là bắt buộc cho RECORDING_ARTIST, được validate ở trên
        if (request.getRecordingRoles() != null) {
            specialist.setRecordingRoles(request.getRecordingRoles());
        }

        Specialist saved = specialistRepository.save(specialist);
        
        // Gán role tương ứng trong identity-service
        Role role = mapSpecializationToRole(request.getSpecialization());
        try {
            identityServiceFeignClient.updateUserRole(userId, role);
            log.info("Updated user role to {} for user ID: {}", role, userId);
        } catch (Exception e) {
            log.error("Failed to update user role for user ID: {}", userId, e);
            // Rollback specialist creation if role update fails
            specialistRepository.delete(saved);
            throw UserRoleUpdateException.failed(userId, e);
        }
        
        log.info("Specialist created successfully with ID: {}", saved.getSpecialistId());
        return specialistMapper.toSpecialistResponse(saved);
    }
    
    /**
     * Cập nhật status của specialist (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SpecialistResponse updateSpecialistStatus(String specialistId, UpdateSpecialistStatusRequest request) {
        log.info("Updating specialist status for ID: {} to {}", specialistId, request.getStatus());
        
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));
        
        specialist.setStatus(request.getStatus());
        
        Specialist saved = specialistRepository.save(specialist);
        log.info("Specialist status updated successfully for ID: {}", specialistId);
        
        return specialistMapper.toSpecialistResponse(saved);
    }
    
    /**
     * Cập nhật max_concurrent_tasks (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SpecialistResponse updateSpecialistSettings(String specialistId, UpdateSpecialistSettingsRequest request) {
        log.info("Updating specialist settings for ID: {}", specialistId);
        
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));
        
        specialistMapper.updateSettingsFromRequest(specialist, request);
        
        Specialist saved = specialistRepository.save(specialist);
        log.info("Specialist settings updated successfully for ID: {}", specialistId);
        
        return specialistMapper.toSpecialistResponse(saved);
    }
    
    /**
     * Lấy danh sách tất cả specialist (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<SpecialistResponse> getAllSpecialists() {
        log.info("Getting all specialists");
        List<Specialist> specialists = specialistRepository.findAll();
        return specialistMapper.toSpecialistResponseList(specialists);
    }
    
    /**
     * Lấy specialist theo ID (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SpecialistResponse getSpecialistById(String specialistId) {
        log.info("Getting specialist with ID: {}", specialistId);
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));
        return specialistMapper.toSpecialistResponse(specialist);
    }
    
    /**
     * Lấy specialist theo user ID (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SpecialistResponse getSpecialistByUserId(String userId) {
        log.info("Getting specialist with user ID: {}", userId);
        Specialist specialist = specialistRepository.findByUserId(userId)
            .orElseThrow(() -> SpecialistNotFoundException.byUserId(userId));
        return specialistMapper.toSpecialistResponse(specialist);
    }
    
    /**
     * Lấy danh sách specialist theo specialization và status
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<SpecialistResponse> getSpecialistsBySpecializationAndStatus(
            SpecialistType specialization, 
            SpecialistStatus status) {
        log.info("Getting specialists with specialization: {} and status: {}", specialization, status);
        List<Specialist> specialists = specialistRepository.findBySpecializationAndStatus(specialization, status);
        return specialistMapper.toSpecialistResponseList(specialists);
    }
    
    /**
     * Map SpecialistType sang Role trong identity-service
     */
    private Role mapSpecializationToRole(SpecialistType specialization) {
        return switch (specialization) {
            case TRANSCRIPTION -> Role.TRANSCRIPTION;
            case ARRANGEMENT -> Role.ARRANGEMENT;
            case RECORDING_ARTIST -> Role.RECORDING_ARTIST;
        };
    }
}

