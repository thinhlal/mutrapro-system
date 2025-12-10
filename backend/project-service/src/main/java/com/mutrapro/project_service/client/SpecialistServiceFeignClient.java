package com.mutrapro.project_service.client;

import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

/**
 * Feign Client để gọi specialist-service
 */
@FeignClient(
    name = "specialist-service",
    url = "${specialist.service.base-url:http://localhost:8086}"
)
public interface SpecialistServiceFeignClient {

    /**
     * Lấy thông tin specialist hiện tại (từ JWT token)
     * GET /specialists/me
     * Trả về Map để tránh dependency với specialist-service DTO
     */
    @GetMapping("/specialists/me")
    ApiResponse<Map<String, Object>> getMySpecialistInfo();

    /**
     * Lấy thông tin specialist theo specialistId (cho manager)
     * GET /manager/specialists/{specialistId}
     * Trả về Map để tránh dependency với specialist-service DTO
     */
    @GetMapping("/manager/specialists/{specialistId}")
    ApiResponse<Map<String, Object>> getSpecialistById(@PathVariable String specialistId);
    
    /**
     * Lấy danh sách tất cả vocalists (RECORDING_ARTIST với recordingRoles chứa VOCALIST)
     * GET /public/specialists/vocalists
     * Public endpoint - không cần authentication
     */
    @GetMapping("/public/specialists/vocalists")
    ApiResponse<List<Map<String, Object>>> getVocalists(
        @RequestParam(required = false) String gender,
        @RequestParam(required = false) List<String> genres);
}

