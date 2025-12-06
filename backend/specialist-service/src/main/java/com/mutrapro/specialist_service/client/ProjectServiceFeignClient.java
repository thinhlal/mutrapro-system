package com.mutrapro.specialist_service.client;

import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.TaskStatsRequest;
import com.mutrapro.shared.dto.TaskStatsResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

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
     * Đồng thời trả về danh sách specialist IDs đã cancelled task cho milestone (nếu có milestoneId)
     */
    @PostMapping("/task-assignments/stats")
    ApiResponse<TaskStatsResponse> getTaskStats(
        @RequestBody TaskStatsRequest request
    );

}

