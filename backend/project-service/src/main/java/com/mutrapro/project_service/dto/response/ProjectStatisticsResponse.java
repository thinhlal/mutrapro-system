package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response chứa tất cả project statistics (contracts và tasks)
 * Gộp lại để giảm số lượng API calls từ frontend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectStatisticsResponse {
    private ContractStatisticsResponse contracts;
    private TaskStatisticsResponse tasks;
}

