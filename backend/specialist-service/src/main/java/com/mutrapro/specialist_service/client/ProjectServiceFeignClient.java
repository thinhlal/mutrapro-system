package com.mutrapro.specialist_service.client;

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
    url = "${project.service.base-url:http://localhost:8082}"
)
public interface ProjectServiceFeignClient {

    /**
     * Lấy thông tin milestone theo milestoneId
     * GET /contracts/{contractId}/milestones/{milestoneId}
     * Trả về Map để tránh dependency với project-service DTO
     */
    @GetMapping("/contracts/{contractId}/milestones/{milestoneId}")
    ApiResponse<Map<String, Object>> getMilestoneById(
        @PathVariable("contractId") String contractId,
        @PathVariable("milestoneId") String milestoneId
    );

    /**
     * Lấy danh sách task assignments theo specialistId
     * GET /task-assignments/by-specialist/{specialistId}
     * Trả về List<Map> để tránh dependency với project-service DTO
     */
    @GetMapping("/task-assignments/by-specialist/{specialistId}")
    ApiResponse<List<Map<String, Object>>> getTaskAssignmentsBySpecialistId(
        @PathVariable("specialistId") String specialistId
    );

    /**
     * Lấy danh sách task assignments cho nhiều specialists cùng lúc (batch query)
     * POST /task-assignments/by-specialists
     * Trả về Map<specialistId, List<Map>> để tránh dependency với project-service DTO
     */
    @PostMapping("/task-assignments/by-specialists")
    ApiResponse<Map<String, List<Map<String, Object>>>> getTaskAssignmentsBySpecialistIds(
        @RequestBody List<String> specialistIds
    );

    /**
     * Lấy contract detail theo contractId
     */
    @GetMapping("/contracts/{contractId}")
    ApiResponse<Map<String, Object>> getContractById(
        @PathVariable("contractId") String contractId
    );
}

