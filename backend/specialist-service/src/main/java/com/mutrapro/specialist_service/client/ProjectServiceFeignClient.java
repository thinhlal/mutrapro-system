package com.mutrapro.specialist_service.client;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.SpecialistTaskStats;
import com.mutrapro.shared.dto.TaskStatsRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

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
     * Lấy thống kê task cho nhiều specialists cùng lúc
     */
    @PostMapping("/task-assignments/stats")
    ApiResponse<Map<String, SpecialistTaskStats>> getTaskStats(
        @RequestBody TaskStatsRequest request
    );

}

