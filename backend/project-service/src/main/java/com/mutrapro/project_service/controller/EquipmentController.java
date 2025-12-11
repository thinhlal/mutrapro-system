package com.mutrapro.project_service.controller;

import com.mutrapro.project_service.dto.request.CreateEquipmentRequest;
import com.mutrapro.project_service.dto.request.UpdateEquipmentRequest;
import com.mutrapro.project_service.dto.response.EquipmentResponse;
import com.mutrapro.project_service.dto.response.ImageUploadResponse;
import com.mutrapro.project_service.service.EquipmentService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/equipment")
@RequiredArgsConstructor
@Tag(name = "Equipment Management", description = "API quản lý thiết bị studio (Admin only)")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EquipmentController {

    EquipmentService equipmentService;

    @GetMapping
    @Operation(summary = "Lấy danh sách equipment", 
               description = "Lấy tất cả equipment. Có thể filter theo active status và skill_id")
    public ApiResponse<List<EquipmentResponse>> listEquipment(
            @Parameter(description = "Filter theo skill_id. Nếu có, chỉ trả về equipment available cho skill đó")
            @RequestParam(required = false) String skillId,
            @Parameter(description = "Nếu true, lấy cả inactive equipment. Mặc định là false (chỉ lấy active)")
            @RequestParam(required = false, defaultValue = "false") Boolean includeInactive,
            @Parameter(description = "Nếu true (khi có skillId), lấy cả equipment unavailable. Mặc định là false (chỉ lấy available)")
            @RequestParam(required = false, defaultValue = "false") Boolean includeUnavailable) {
        
        List<EquipmentResponse> items;
        
        if (skillId != null) {
            if (includeUnavailable) {
                log.info("Fetching equipment for skill ID: {} (including unavailable)", skillId);
                items = equipmentService.getEquipmentBySkillId(skillId);
            } else {
                log.info("Fetching available equipment for skill ID: {}", skillId);
                items = equipmentService.getAvailableEquipmentBySkillId(skillId);
            }
        } else {
            log.info("Listing all equipment with includeInactive: {}", includeInactive);
            items = equipmentService.getAllEquipment(includeInactive);
        }
        
        return ApiResponse.<List<EquipmentResponse>>builder()
                .message("Equipment retrieved successfully")
                .data(items)
                .build();
    }

    @GetMapping("/available")
    @Operation(summary = "Lấy danh sách equipment còn available (còn trong kho)", 
               description = "Chỉ trả về equipment active và còn available (total_quantity > 0)")
    public ApiResponse<List<EquipmentResponse>> getAvailableEquipment() {
        log.info("Fetching available equipment");
        List<EquipmentResponse> items = equipmentService.getAvailableEquipment();
        return ApiResponse.<List<EquipmentResponse>>builder()
                .message("Available equipment retrieved successfully")
                .data(items)
                .build();
    }

    @GetMapping("/by-ids")
    @Operation(summary = "Lấy danh sách equipment theo list IDs")
    public ApiResponse<List<EquipmentResponse>> getEquipmentByIds(
            @Parameter(description = "Danh sách IDs của equipment (comma-separated hoặc multiple params)")
            @RequestParam("ids") List<String> equipmentIds) {
        log.info("Fetching equipment by IDs: {}", equipmentIds);
        List<EquipmentResponse> items = equipmentService.getEquipmentByIds(equipmentIds);
        return ApiResponse.<List<EquipmentResponse>>builder()
                .message("Equipment retrieved successfully")
                .data(items)
                .build();
    }

    @GetMapping("/{equipmentId}")
    @Operation(summary = "Lấy chi tiết equipment theo ID", 
               description = "Trả về thông tin chi tiết equipment bao gồm danh sách skill_ids được map")
    public ApiResponse<EquipmentResponse> getEquipmentById(
            @Parameter(description = "ID của equipment")
            @PathVariable String equipmentId) {
        log.info("Fetching equipment by ID: {}", equipmentId);
        EquipmentResponse item = equipmentService.getEquipmentById(equipmentId);
        return ApiResponse.<EquipmentResponse>builder()
                .message("Equipment retrieved successfully")
                .data(item)
                .build();
    }

    @PostMapping(consumes = {"multipart/form-data"})
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Tạo equipment mới (Admin only)", 
               description = "Tạo equipment mới với thông tin cơ bản, có thể upload ảnh và map với skills cùng lúc")
    public ApiResponse<EquipmentResponse> createEquipment(
            @Valid @ModelAttribute CreateEquipmentRequest request) {
        log.info("Creating new equipment: equipmentName={}, brand={}, model={}", 
                request.getEquipmentName(), request.getBrand(), request.getModel());
        EquipmentResponse created = equipmentService.createEquipment(request);
        return ApiResponse.<EquipmentResponse>builder()
                .message("Equipment created successfully")
                .data(created)
                .statusCode(201)
                .build();
    }

    @PutMapping(value = "/{equipmentId}", consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Cập nhật thông tin equipment (Admin only)", 
               description = "Cập nhật thông tin equipment, có thể update image và skill mappings cùng lúc")
    public ApiResponse<EquipmentResponse> updateEquipment(
            @Parameter(description = "ID của equipment")
            @PathVariable String equipmentId,
            @Valid @ModelAttribute UpdateEquipmentRequest request) {
        log.info("Updating equipment: equipmentId={}", equipmentId);
        EquipmentResponse updated = equipmentService.updateEquipment(equipmentId, request);
        return ApiResponse.<EquipmentResponse>builder()
                .message("Equipment updated successfully")
                .data(updated)
                .build();
    }

    @PostMapping(value = "/{equipmentId}/image", consumes = {"multipart/form-data"})
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Upload hình ảnh cho equipment (Admin only)")
    public ApiResponse<ImageUploadResponse> uploadImage(
            @Parameter(description = "ID của equipment")
            @PathVariable String equipmentId,
            @Parameter(description = "File hình ảnh (JPEG, PNG)")
            @RequestParam("image") MultipartFile imageFile) {
        log.info("Uploading image for equipment: equipmentId={}", equipmentId);
        String imageUrl = equipmentService.uploadImage(equipmentId, imageFile);
        return ApiResponse.<ImageUploadResponse>builder()
                .message("Image uploaded successfully")
                .data(ImageUploadResponse.builder()
                        .instrumentId(equipmentId) // Reuse ImageUploadResponse structure
                        .imageUrl(imageUrl)
                        .build())
                .build();
    }
}

