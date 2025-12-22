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
    url = "${request.service.base-url:http://request-service:8084}",
    path = ""
)
public interface RequestServiceFeignClient {

    /**
     * Lấy chi tiết service request theo requestId (đầy đủ thông tin kèm files)
     * GET /requests/{requestId}
     * ServiceRequestInfoResponse đã được mở rộng để chứa đầy đủ thông tin
     */
    @GetMapping("/requests/{requestId}")
    ApiResponse<ServiceRequestInfoResponse> getServiceRequestById(@PathVariable("requestId") String requestId);

    /**
     * Lấy thông tin cơ bản của service request (không kèm files và manager info)
     * GET /requests/{requestId}/basic
     * Tối ưu cho performance - không fetch files từ project-service
     */
    @GetMapping("/requests/{requestId}/basic")
    ApiResponse<ServiceRequestInfoResponse> getServiceRequestBasicInfo(@PathVariable("requestId") String requestId);

    /**
     * Cập nhật status của service request
     * PUT /requests/{requestId}/status?status={status}
     */
    @PutMapping("/requests/{requestId}/status")
    ApiResponse<ServiceRequestInfoResponse> updateRequestStatus(
        @PathVariable("requestId") String requestId,
        @RequestParam("status") String status);
    
    /**
     * Cập nhật totalPrice snapshot cho service request (dùng sau khi tạo booking)
     * PUT /requests/{requestId}/total-price?totalPrice={totalPrice}&currency={currency}
     */
    @PutMapping("/requests/{requestId}/total-price")
    ApiResponse<ServiceRequestInfoResponse> updateRequestTotalPrice(
        @PathVariable("requestId") String requestId,
        @RequestParam("totalPrice") java.math.BigDecimal totalPrice,
        @RequestParam(value = "currency", required = false) String currency);
}


