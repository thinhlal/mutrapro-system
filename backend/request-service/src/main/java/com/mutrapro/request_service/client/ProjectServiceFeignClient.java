package com.mutrapro.request_service.client;

import com.mutrapro.request_service.dto.response.FileInfoResponse;
import com.mutrapro.request_service.dto.response.RequestContractInfo;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;

/**
 * Feign Client để gọi project-service
 */
@FeignClient(
    name = "project-service",
    url = "${project.service.base-url:http://localhost:8082}",
    path = ""
)
public interface ProjectServiceFeignClient {

    /**
     * Lấy danh sách files theo requestId
     * GET /files/by-request/{requestId}
     */
    @GetMapping("/files/by-request/{requestId}")
    ApiResponse<List<FileInfoResponse>> getFilesByRequestId(@PathVariable("requestId") String requestId);
    
    /**
     * Lấy thông tin contract cho nhiều requestIds (batch)
     * POST /contracts/by-request-ids
     */
    @PostMapping("/contracts/by-request-ids")
    ApiResponse<Map<String, RequestContractInfo>> getContractInfoByRequestIds(@RequestBody List<String> requestIds);
}

