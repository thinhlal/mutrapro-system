package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.request.CreateEquipmentRequest;
import com.mutrapro.project_service.dto.request.UpdateEquipmentRequest;
import com.mutrapro.project_service.dto.response.EquipmentResponse;
import com.mutrapro.project_service.entity.Equipment;
import com.mutrapro.project_service.entity.SkillEquipmentMapping;
import com.mutrapro.project_service.exception.EquipmentDuplicateException;
import com.mutrapro.project_service.exception.EquipmentNotFoundException;
import com.mutrapro.project_service.exception.FileRequiredException;
import com.mutrapro.project_service.exception.FileSizeExceededException;
import com.mutrapro.project_service.exception.FileTypeNotAllowedException;
import com.mutrapro.project_service.repository.EquipmentRepository;
import com.mutrapro.project_service.repository.SkillEquipmentMappingRepository;
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
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EquipmentService {

    EquipmentRepository equipmentRepository;
    SkillEquipmentMappingRepository skillEquipmentMappingRepository;
    S3Service s3Service;
    
    @NonFinal
    @Value("${file.upload.max-size:104857600}")
    Long maxFileSize;
    
    @NonFinal
    @Value("${file.upload.allowed-image-types:image/jpeg,image/jpg,image/png}")
    String allowedImageTypes;

    /**
     * Lấy tất cả equipment (có thể filter theo active status)
     */
    public List<EquipmentResponse> getAllEquipment(boolean includeInactive) {
        List<Equipment> equipments;
        
        if (includeInactive) {
            log.debug("Fetching all equipment (including inactive)");
            equipments = equipmentRepository.findAll();
        } else {
            log.debug("Fetching all active equipment");
            equipments = equipmentRepository.findByIsActiveTrue();
        }
        
        return equipments.stream()
                .map(this::toEquipmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy equipment theo ID (bao gồm skill mappings)
     */
    public EquipmentResponse getEquipmentById(String equipmentId) {
        log.debug("Fetching equipment by ID: {}", equipmentId);
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> EquipmentNotFoundException.byId(equipmentId));
        
        return toEquipmentResponseWithSkills(equipment);
    }

    /**
     * Lấy equipment theo list IDs
     */
    public List<EquipmentResponse> getEquipmentByIds(List<String> equipmentIds) {
        if (equipmentIds == null || equipmentIds.isEmpty()) {
            log.debug("Empty equipment IDs list, returning empty list");
            return List.of();
        }
        
        log.debug("Fetching equipment by IDs: {}", equipmentIds);
        List<Equipment> equipments = equipmentRepository.findByEquipmentIdIn(equipmentIds);
        
        return equipments.stream()
                .map(this::toEquipmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy available equipment (còn trong kho) và active
     */
    public List<EquipmentResponse> getAvailableEquipment() {
        log.debug("Fetching available active equipment");
        List<Equipment> equipments = equipmentRepository.findAvailableActiveEquipment();
        
        return equipments.stream()
                .map(this::toEquipmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy equipment theo skill_id (chỉ lấy available)
     */
    public List<EquipmentResponse> getAvailableEquipmentBySkillId(String skillId) {
        log.debug("Fetching available equipment for skill ID: {}", skillId);
        List<Equipment> equipments = equipmentRepository.findAvailableEquipmentBySkillId(skillId);
        
        return equipments.stream()
                .map(this::toEquipmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy equipment theo skill_id (kể cả unavailable)
     */
    public List<EquipmentResponse> getEquipmentBySkillId(String skillId) {
        log.debug("Fetching equipment for skill ID: {} (including unavailable)", skillId);
        List<Equipment> equipments = equipmentRepository.findEquipmentBySkillId(skillId);
        
        return equipments.stream()
                .map(this::toEquipmentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Tạo equipment mới (Admin only)
     */
    @Transactional
    public EquipmentResponse createEquipment(CreateEquipmentRequest request) {
        log.info("Creating new equipment: equipmentName={}, brand={}, model={}", 
                request.getEquipmentName(), request.getBrand(), request.getModel());
        
        // Check if equipment with same brand+model already exists
        if (request.getBrand() != null && request.getModel() != null) {
            equipmentRepository.findByBrandAndModel(request.getBrand(), request.getModel())
                    .ifPresent(existing -> {
                        throw EquipmentDuplicateException.create(request.getBrand(), request.getModel());
                    });
        }
        
        // Create new equipment
        Equipment equipment = Equipment.builder()
                .equipmentName(request.getEquipmentName())
                .brand(request.getBrand())
                .model(request.getModel())
                .description(request.getDescription())
                .specifications(request.getSpecifications())
                .rentalFee(request.getRentalFee() != null ? request.getRentalFee() : BigDecimal.ZERO)
                .totalQuantity(request.getTotalQuantity() != null ? request.getTotalQuantity() : 1)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        
        // Upload image if provided
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            validateImageFile(request.getImage());
            try {
                String imageUrl = s3Service.uploadPublicFileAndReturnUrl(
                        request.getImage().getInputStream(),
                        request.getImage().getOriginalFilename(),
                        request.getImage().getContentType(),
                        request.getImage().getSize(),
                        "equipment"
                );
                equipment.setImage(imageUrl);
            } catch (IOException e) {
                log.error("Error reading image file: {}", e.getMessage(), e);
                throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
            }
        }
        
        Equipment saved = equipmentRepository.save(equipment);
        
        // Create skill mappings if provided
        if (request.getSkillIds() != null && !request.getSkillIds().isEmpty()) {
            List<SkillEquipmentMapping> mappings = new ArrayList<>();
            for (String skillId : request.getSkillIds()) {
                // Soft reference - no need to check if skill exists
                SkillEquipmentMapping mapping = SkillEquipmentMapping.builder()
                        .skillId(skillId)
                        .equipment(saved)
                        .build();
                mappings.add(mapping);
            }
            skillEquipmentMappingRepository.saveAll(mappings);
            log.info("Created {} skill mappings for equipment: {}", mappings.size(), saved.getEquipmentId());
        }
        
        log.info("Created new equipment: equipmentId={}, equipmentName={}", 
                saved.getEquipmentId(), saved.getEquipmentName());
        
        return toEquipmentResponseWithSkills(saved);
    }

    /**
     * Cập nhật equipment (Admin only)
     */
    @Transactional
    public EquipmentResponse updateEquipment(String equipmentId, UpdateEquipmentRequest request) {
        log.info("Updating equipment: equipmentId={}", equipmentId);
        
        // Find equipment
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> EquipmentNotFoundException.byId(equipmentId));
        
        // Update fields if provided
        if (request.getEquipmentName() != null && !request.getEquipmentName().trim().isEmpty()) {
            equipment.setEquipmentName(request.getEquipmentName().trim());
        }
        
        if (request.getBrand() != null) {
            equipment.setBrand(request.getBrand());
        }
        
        if (request.getModel() != null) {
            equipment.setModel(request.getModel());
        }
        
        // Check brand+model uniqueness if both are being updated
        if (request.getBrand() != null || request.getModel() != null) {
            String newBrand = request.getBrand() != null ? request.getBrand() : equipment.getBrand();
            String newModel = request.getModel() != null ? request.getModel() : equipment.getModel();
            
            if (newBrand != null && newModel != null) {
                equipmentRepository.findByBrandAndModel(newBrand, newModel)
                        .ifPresent(existing -> {
                            if (!existing.getEquipmentId().equals(equipmentId)) {
                                throw EquipmentDuplicateException.create(newBrand, newModel);
                            }
                        });
            }
        }
        
        if (request.getDescription() != null) {
            equipment.setDescription(request.getDescription());
        }
        
        if (request.getSpecifications() != null) {
            equipment.setSpecifications(request.getSpecifications());
        }
        
        if (request.getRentalFee() != null) {
            equipment.setRentalFee(request.getRentalFee());
        }
        
        if (request.getTotalQuantity() != null) {
            equipment.setTotalQuantity(request.getTotalQuantity());
        }
        
        if (request.getIsActive() != null) {
            equipment.setIsActive(request.getIsActive());
        }
        
        // Update image if provided
        if (request.getImage() != null && !request.getImage().isEmpty()) {
            validateImageFile(request.getImage());
            try {
                String imageUrl = s3Service.uploadPublicFileAndReturnUrl(
                        request.getImage().getInputStream(),
                        request.getImage().getOriginalFilename(),
                        request.getImage().getContentType(),
                        request.getImage().getSize(),
                        "equipment"
                );
                equipment.setImage(imageUrl);
                log.info("Image updated for equipment: equipmentId={}, imageUrl={}", equipmentId, imageUrl);
            } catch (IOException e) {
                log.error("Error reading image file during update: {}", e.getMessage(), e);
                throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
            }
        }
        
        // Update skill mappings if provided
        if (request.getSkillIds() != null) {
            // Delete existing mappings
            skillEquipmentMappingRepository.deleteByEquipment_EquipmentId(equipmentId);
            
            // Create new mappings
            if (!request.getSkillIds().isEmpty()) {
                List<SkillEquipmentMapping> mappings = new ArrayList<>();
                for (String skillId : request.getSkillIds()) {
                    SkillEquipmentMapping mapping = SkillEquipmentMapping.builder()
                            .skillId(skillId)
                            .equipment(equipment)
                            .build();
                    mappings.add(mapping);
                }
                skillEquipmentMappingRepository.saveAll(mappings);
                log.info("Updated skill mappings for equipment: {} ({} mappings)", equipmentId, mappings.size());
            } else {
                log.info("Removed all skill mappings for equipment: {}", equipmentId);
            }
        }
        
        Equipment saved = equipmentRepository.save(equipment);
        log.info("Updated equipment: equipmentId={}, equipmentName={}", 
                saved.getEquipmentId(), saved.getEquipmentName());
        
        return toEquipmentResponseWithSkills(saved);
    }

    /**
     * Upload image cho equipment
     */
    @Transactional
    public String uploadImage(String equipmentId, MultipartFile imageFile) {
        // Find equipment
        Equipment equipment = equipmentRepository.findById(equipmentId)
                .orElseThrow(() -> EquipmentNotFoundException.byId(equipmentId));
        
        // Validate image file
        validateImageFile(imageFile);
        
        try {
            // Upload to S3 with public access and get public URL
            String imageUrl = s3Service.uploadPublicFileAndReturnUrl(
                    imageFile.getInputStream(),
                    imageFile.getOriginalFilename(),
                    imageFile.getContentType(),
                    imageFile.getSize(),
                    "equipment"
            );
            
            // Update equipment image URL
            equipment.setImage(imageUrl);
            equipmentRepository.save(equipment);
            
            log.info("Image uploaded and updated for equipment: equipmentId={}, imageUrl={}", 
                    equipmentId, imageUrl);
            return imageUrl;
        } catch (IOException e) {
            log.error("Error reading image file: {}", e.getMessage(), e);
            throw new RuntimeException("Error reading image file: " + e.getMessage(), e);
        }
    }

    /**
     * Convert Equipment entity to EquipmentResponse (without skill mappings)
     */
    private EquipmentResponse toEquipmentResponse(Equipment equipment) {
        return EquipmentResponse.builder()
                .equipmentId(equipment.getEquipmentId())
                .equipmentName(equipment.getEquipmentName())
                .brand(equipment.getBrand())
                .model(equipment.getModel())
                .description(equipment.getDescription())
                .specifications(equipment.getSpecifications())
                .rentalFee(equipment.getRentalFee())
                .totalQuantity(equipment.getTotalQuantity())
                .availableQuantity(equipment.getTotalQuantity())
                .isActive(equipment.getIsActive())
                .image(equipment.getImage())
                .build();
    }

    /**
     * Convert Equipment entity to EquipmentResponse (with skill mappings)
     */
    private EquipmentResponse toEquipmentResponseWithSkills(Equipment equipment) {
        List<String> skillIds = skillEquipmentMappingRepository.findSkillIdsByEquipmentId(equipment.getEquipmentId());
        
        return EquipmentResponse.builder()
                .equipmentId(equipment.getEquipmentId())
                .equipmentName(equipment.getEquipmentName())
                .brand(equipment.getBrand())
                .model(equipment.getModel())
                .description(equipment.getDescription())
                .specifications(equipment.getSpecifications())
                .rentalFee(equipment.getRentalFee())
                .totalQuantity(equipment.getTotalQuantity())
                .availableQuantity(equipment.getTotalQuantity())
                .isActive(equipment.getIsActive())
                .image(equipment.getImage())
                .skillIds(skillIds)
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

