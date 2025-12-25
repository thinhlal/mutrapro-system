package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response chứa tất cả project statistics (contracts, tasks, và module statistics)
 * Gộp lại để giảm số lượng API calls từ frontend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllProjectStatisticsResponse {
    private ProjectStatisticsResponse statistics; // contracts và tasks
    private ModuleStatisticsResponse moduleStatistics; // equipment, studioBookings, revisions
}

