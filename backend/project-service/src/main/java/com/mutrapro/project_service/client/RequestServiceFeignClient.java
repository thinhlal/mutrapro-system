package com.mutrapro.project_service.client;

import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

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
     * Lấy chi tiết service request theo requestId
     * GET /requests/{requestId}
     */
    @GetMapping("/{requestId}")
    ApiResponse<ServiceRequestInfoResponse> getServiceRequestById(@PathVariable("requestId") String requestId);
}

