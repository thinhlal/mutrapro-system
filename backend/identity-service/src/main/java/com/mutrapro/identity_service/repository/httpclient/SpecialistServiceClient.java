package com.mutrapro.identity_service.repository.httpclient;

import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Map;

/**
 * Feign Client để gọi specialist-service từ identity-service
 * Dùng để lấy specialistId từ userId khi generate JWT token
 */
@FeignClient(
    name = "specialist-service",
    url = "${specialist.service.base-url:http://specialist-service:8086}"
)
public interface SpecialistServiceClient {

    /**
     * Lấy thông tin specialist theo userId (internal endpoint)
     * GET /admin/specialists/user/{userId}
     * Trả về Map để tránh dependency với specialist-service DTO
     */
    @GetMapping("/admin/specialists/user/{userId}")
    ApiResponse<Map<String, Object>> getSpecialistByUserId(@PathVariable("userId") String userId);
}

