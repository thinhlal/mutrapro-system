package com.mutrapro.request_service.client;

import com.mutrapro.request_service.dto.response.FileInfoResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

/**
 * Feign Client để gọi project-service
 */
@FeignClient(
    name = "project-service",
    url = "${project.service.base-url:http://localhost:8082}",
    path = "/files"
)
public interface ProjectServiceFeignClient {

    /**
     * Lấy danh sách files theo requestId
     * GET /files/by-request/{requestId}
     */
    @GetMapping("/by-request/{requestId}")
    ApiResponse<List<FileInfoResponse>> getFilesByRequestId(@PathVariable("requestId") String requestId);
}

