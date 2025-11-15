package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.request.*;
import com.mutrapro.specialist_service.dto.response.*;
import com.mutrapro.specialist_service.service.SpecialistProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller cho Specialist tự quản lý profile của mình
 */
@Slf4j
@RestController
@RequestMapping("/specialists/me")
@RequiredArgsConstructor
public class SpecialistProfileController {
    
    private final SpecialistProfileService specialistProfileService;
    
    /**
     * Lấy profile của specialist hiện tại
     */
    @GetMapping
    public ApiResponse<SpecialistResponse> getMyProfile() {
        log.info("GET /specialists/me - Getting my profile");
        SpecialistResponse response = specialistProfileService.getMyProfile();
        return ApiResponse.<SpecialistResponse>builder()
            .message("Profile retrieved successfully")
            .data(response)
            .build();
    }
    
    /**
     * Lấy profile đầy đủ của specialist hiện tại (bao gồm skills và demos)
     */
    @GetMapping("/detail")
    public ApiResponse<SpecialistDetailResponse> getMyProfileDetail() {
        log.info("GET /specialists/me/detail - Getting my full profile");
        SpecialistDetailResponse response = specialistProfileService.getMyProfileDetail();
        return ApiResponse.<SpecialistDetailResponse>builder()
            .message("Profile detail retrieved successfully")
            .data(response)
            .build();
    }
    
    /**
     * Cập nhật profile của specialist hiện tại
     */
    @PutMapping
    public ApiResponse<SpecialistResponse> updateMyProfile(@Valid @RequestBody UpdateProfileRequest request) {
        log.info("PUT /specialists/me - Updating my profile");
        SpecialistResponse response = specialistProfileService.updateMyProfile(request);
        return ApiResponse.<SpecialistResponse>builder()
            .message("Profile updated successfully")
            .data(response)
            .build();
    }
    
    // ===== SKILLS =====
    
    /**
     * Lấy danh sách tất cả skills có sẵn
     */
    @GetMapping("/skills/available")
    public ApiResponse<List<SkillResponse>> getAvailableSkills() {
        log.info("GET /specialists/me/skills/available - Getting available skills");
        List<SkillResponse> skills = specialistProfileService.getAllSkills();
        return ApiResponse.<List<SkillResponse>>builder()
            .message("Available skills retrieved successfully")
            .data(skills)
            .build();
    }
    
    /**
     * Lấy danh sách skills của specialist hiện tại
     */
    @GetMapping("/skills")
    public ApiResponse<List<SpecialistSkillResponse>> getMySkills() {
        log.info("GET /specialists/me/skills - Getting my skills");
        List<SpecialistSkillResponse> skills = specialistProfileService.getMySkills();
        return ApiResponse.<List<SpecialistSkillResponse>>builder()
            .message("Skills retrieved successfully")
            .data(skills)
            .build();
    }
    
    /**
     * Thêm skill cho specialist hiện tại
     */
    @PostMapping("/skills")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SpecialistSkillResponse> addSkill(@Valid @RequestBody AddSkillRequest request) {
        log.info("POST /specialists/me/skills - Adding skill");
        SpecialistSkillResponse response = specialistProfileService.addSkill(request);
        return ApiResponse.<SpecialistSkillResponse>builder()
            .message("Skill added successfully")
            .data(response)
            .statusCode(201)
            .build();
    }
    
    /**
     * Cập nhật skill của specialist hiện tại
     */
    @PutMapping("/skills/{skillId}")
    public ApiResponse<SpecialistSkillResponse> updateSkill(
            @PathVariable String skillId,
            @Valid @RequestBody UpdateSkillRequest request) {
        log.info("PUT /specialists/me/skills/{} - Updating skill", skillId);
        SpecialistSkillResponse response = specialistProfileService.updateSkill(skillId, request);
        return ApiResponse.<SpecialistSkillResponse>builder()
            .message("Skill updated successfully")
            .data(response)
            .build();
    }
    
    /**
     * Xóa skill của specialist hiện tại
     */
    @DeleteMapping("/skills/{skillId}")
    public ApiResponse<Void> deleteSkill(@PathVariable String skillId) {
        log.info("DELETE /specialists/me/skills/{} - Deleting skill", skillId);
        specialistProfileService.deleteSkill(skillId);
        return ApiResponse.<Void>builder()
            .message("Skill deleted successfully")
            .build();
    }
    
    // ===== DEMOS =====
    
    /**
     * Lấy danh sách demos của specialist hiện tại
     */
    @GetMapping("/demos")
    public ApiResponse<List<ArtistDemoResponse>> getMyDemos() {
        log.info("GET /specialists/me/demos - Getting my demos");
        List<ArtistDemoResponse> demos = specialistProfileService.getMyDemos();
        return ApiResponse.<List<ArtistDemoResponse>>builder()
            .message("Demos retrieved successfully")
            .data(demos)
            .build();
    }
    
    /**
     * Tạo demo mới cho specialist hiện tại
     */
    @PostMapping("/demos")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ArtistDemoResponse> createDemo(@Valid @RequestBody CreateDemoRequest request) {
        log.info("POST /specialists/me/demos - Creating demo");
        ArtistDemoResponse response = specialistProfileService.createDemo(request);
        return ApiResponse.<ArtistDemoResponse>builder()
            .message("Demo created successfully")
            .data(response)
            .statusCode(201)
            .build();
    }
    
    /**
     * Cập nhật demo của specialist hiện tại
     */
    @PutMapping("/demos/{demoId}")
    public ApiResponse<ArtistDemoResponse> updateDemo(
            @PathVariable String demoId,
            @Valid @RequestBody UpdateDemoRequest request) {
        log.info("PUT /specialists/me/demos/{} - Updating demo", demoId);
        ArtistDemoResponse response = specialistProfileService.updateDemo(demoId, request);
        return ApiResponse.<ArtistDemoResponse>builder()
            .message("Demo updated successfully")
            .data(response)
            .build();
    }
    
    /**
     * Xóa demo của specialist hiện tại
     */
    @DeleteMapping("/demos/{demoId}")
    public ApiResponse<Void> deleteDemo(@PathVariable String demoId) {
        log.info("DELETE /specialists/me/demos/{} - Deleting demo", demoId);
        specialistProfileService.deleteDemo(demoId);
        return ApiResponse.<Void>builder()
            .message("Demo deleted successfully")
            .build();
    }
}

