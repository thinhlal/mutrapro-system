package com.mutrapro.specialist_service.controller;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.service.SpecialistLookupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller cho Manager xem danh sách specialists
 */
@Slf4j
@RestController
@RequestMapping("/manager/specialists")
@RequiredArgsConstructor
public class ManagerSpecialistController {

    private final SpecialistLookupService specialistLookupService;

    /**
     * Lấy danh sách specialists đang active (hoặc filter theo specialization)
     * @param milestoneId (optional) ID của milestone đang assign - dùng để tính tasksInSlaWindow
     * @param contractId (optional) ID của contract - cần khi có milestoneId
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    public ApiResponse<List<SpecialistResponse>> getAvailableSpecialists(
            @RequestParam(required = false) String specialization,
            @RequestParam(required = false, name = "skillNames") List<String> skillNames,
            @RequestParam(required = false) String milestoneId,
            @RequestParam(required = false) String contractId) {
        log.info("GET /manager/specialists - specialization: {}, skillNames: {}, milestoneId: {}, contractId: {}", 
            specialization, skillNames, milestoneId, contractId);
        List<SpecialistResponse> specialists = specialistLookupService.getAvailableSpecialists(
            specialization, skillNames, milestoneId, contractId);
        return ApiResponse.<List<SpecialistResponse>>builder()
                .message("Available specialists retrieved successfully")
                .data(specialists)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }

    /**
     * Lấy specialist theo specialistId (cho manager)
     */
    @GetMapping("/{specialistId}")
    @PreAuthorize("hasAnyRole('MANAGER','SYSTEM_ADMIN')")
    public ApiResponse<SpecialistResponse> getSpecialistById(@PathVariable String specialistId) {
        log.info("GET /manager/specialists/{} - Getting specialist", specialistId);
        SpecialistResponse specialist = specialistLookupService.getSpecialistById(specialistId);
        return ApiResponse.<SpecialistResponse>builder()
                .message("Specialist retrieved successfully")
                .data(specialist)
                .statusCode(HttpStatus.OK.value())
                .status("success")
                .build();
    }
}

