package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.response.SpecialistDetailResponse;
import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.service.SpecialistLookupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public Controller cho Customer xem danh sách specialists (vocalists, instrumentalists)
 * Không cần authentication
 */
@Slf4j
@RestController
@RequestMapping("/public/specialists")
@RequiredArgsConstructor
public class PublicSpecialistController {

    private final SpecialistLookupService specialistLookupService;

    /**
     * Lấy danh sách vocalists (RECORDING_ARTIST với recordingRoles chứa VOCALIST)
     * Public endpoint - không cần authentication
     * 
     * @param gender Filter theo giới tính (FEMALE, MALE, hoặc null để lấy tất cả)
     * @param genres Filter theo thể loại (có thể truyền nhiều genres, ví dụ: genres=Pop&genres=Rock)
     */
    @GetMapping("/vocalists")
    public ApiResponse<List<SpecialistResponse>> getVocalists(
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) List<String> genres) {
        log.info("GET /public/specialists/vocalists - gender: {}, genres: {}", gender, genres);
        
        List<SpecialistResponse> vocalists = specialistLookupService.getVocalists(gender, genres);
        
        return ApiResponse.<List<SpecialistResponse>>builder()
                .message("Vocalists retrieved successfully")
                .data(vocalists)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    /**
     * Lấy chi tiết specialist theo ID (public - cho customer xem)
     * Bao gồm skills và public demos
     */
    @GetMapping("/{specialistId}")
    public ApiResponse<SpecialistDetailResponse> getSpecialistDetail(@PathVariable String specialistId) {
        log.info("GET /public/specialists/{} - Getting specialist detail", specialistId);
        
        SpecialistDetailResponse detail = specialistLookupService.getSpecialistDetail(specialistId);
        
        return ApiResponse.<SpecialistDetailResponse>builder()
                .message("Specialist detail retrieved successfully")
                .data(detail)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }
}

