package com.mutrapro.project_service.client;

import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

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
}

