package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.response.SkillResponse;
import com.mutrapro.specialist_service.service.PublicSkillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public endpoints cho Skills (không yêu cầu authentication)
 * Dùng cho customer khi cần xem danh sách skills available
 */
@Slf4j
@RestController
@RequestMapping("/public/skills")
@RequiredArgsConstructor
@Tag(name = "Public Skills", description = "Public endpoints for skills (no authentication required)")
public class PublicSkillController {
    
    private final PublicSkillService publicSkillService;
    
    /**
     * Lấy tất cả skills (public access)
     * Endpoint này không yêu cầu authentication
     * Dùng cho customer khi booking để chọn skills/instruments
     */
    @GetMapping
    @Operation(
        summary = "Get all skills (public)", 
        description = "Get all available skills. No authentication required. Used by customers for booking instruments."
    )
    public ApiResponse<List<SkillResponse>> getAllSkills() {
        log.info("GET /public/skills - Getting all skills (public access)");
        List<SkillResponse> skills = publicSkillService.getAllSkills();
        return ApiResponse.<List<SkillResponse>>builder()
            .message("Skills retrieved successfully")
            .data(skills)
            .build();
    }
}

