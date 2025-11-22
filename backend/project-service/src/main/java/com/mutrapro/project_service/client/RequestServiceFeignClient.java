package com.mutrapro.project_service.client;

import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Feign Client để gọi request-service
 */
@FeignClient(
    name = "request-service",
    url = "${request.service.base-url:http://localhost:8084}",
    path = "/requests"
)
public interface RequestServiceFeignClient {

    /**
     * Lấy chi tiết service request theo requestId (đầy đủ thông tin)
     * GET /requests/{requestId}
     * ServiceRequestInfoResponse đã được mở rộng để chứa đầy đủ thông tin
     */
    @GetMapping("/{requestId}")
    ApiResponse<ServiceRequestInfoResponse> getServiceRequestById(@PathVariable("requestId") String requestId);

    /**
     * Cập nhật status của service request
     * PUT /requests/{requestId}/status?status={status}
     */
    @PutMapping("/{requestId}/status")
    ApiResponse<ServiceRequestInfoResponse> updateRequestStatus(
        @PathVariable("requestId") String requestId,
        @RequestParam("status") String status);
}


