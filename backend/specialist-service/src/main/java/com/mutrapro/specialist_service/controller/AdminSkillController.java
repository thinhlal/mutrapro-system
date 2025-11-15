package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.request.AdminUpdateSkillRequest;
import com.mutrapro.specialist_service.dto.request.CreateSkillRequest;
import com.mutrapro.specialist_service.dto.response.SkillResponse;
import com.mutrapro.specialist_service.service.AdminSkillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cho Admin quản lý skills (Piano, Guitar, etc.)
 */
@Slf4j
@RestController
@RequestMapping("/admin/skills")
@RequiredArgsConstructor
@Tag(name = "Admin Skill Management", description = "APIs for admin to manage skills")
public class AdminSkillController {
    
    private final AdminSkillService adminSkillService;
    
    /**
     * Tạo skill mới
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create new skill", description = "Create a new skill (SYSTEM_ADMIN only)")
    public ApiResponse<SkillResponse> createSkill(@Valid @RequestBody CreateSkillRequest request) {
        log.info("POST /admin/skills - Creating skill: {}", request.getSkillName());
        SkillResponse response = adminSkillService.createSkill(request);
        return ApiResponse.<SkillResponse>builder()
            .message("Skill created successfully")
            .data(response)
            .statusCode(201)
            .build();
    }
    
    /**
     * Lấy tất cả skills
     */
    @GetMapping
    @Operation(summary = "Get all skills", description = "Get all skills (SYSTEM_ADMIN only)")
    public ApiResponse<List<SkillResponse>> getAllSkills() {
        log.info("GET /admin/skills - Getting all skills");
        List<SkillResponse> skills = adminSkillService.getAllSkills();
        return ApiResponse.<List<SkillResponse>>builder()
            .message("Skills retrieved successfully")
            .data(skills)
            .build();
    }
    
    /**
     * Lấy skill theo ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get skill by ID", description = "Get skill by ID (SYSTEM_ADMIN only)")
    public ApiResponse<SkillResponse> getSkillById(@PathVariable String id) {
        log.info("GET /admin/skills/{} - Getting skill", id);
        SkillResponse skill = adminSkillService.getSkillById(id);
        return ApiResponse.<SkillResponse>builder()
            .message("Skill retrieved successfully")
            .data(skill)
            .build();
    }
    
    /**
     * Cập nhật skill
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update skill", description = "Update skill (SYSTEM_ADMIN only)")
    public ApiResponse<SkillResponse> updateSkill(
            @PathVariable String id,
            @Valid @RequestBody AdminUpdateSkillRequest request) {
        log.info("PUT /admin/skills/{} - Updating skill", id);
        SkillResponse response = adminSkillService.updateSkill(id, request);
        return ApiResponse.<SkillResponse>builder()
            .message("Skill updated successfully")
            .data(response)
            .build();
    }
    
    /**
     * Xóa skill
     * Chỉ cho phép xóa khi skill không được sử dụng bởi specialist hoặc demo nào
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete skill", description = "Delete skill. Only allowed when skill is not being used by any specialist or demo (SYSTEM_ADMIN only)")
    public ApiResponse<Void> deleteSkill(@PathVariable String id) {
        log.info("DELETE /admin/skills/{} - Deleting skill", id);
        adminSkillService.deleteSkill(id);
        return ApiResponse.<Void>builder()
            .message("Skill deleted successfully")
            .build();
    }
}

