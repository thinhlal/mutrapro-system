package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response chứa tất cả statistics liên quan đến specialists (specialists và skills)
 * Gộp lại để giảm số lượng API calls từ frontend
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistModuleStatisticsResponse {
    private SpecialistStatisticsResponse specialists;
    private SkillStatisticsResponse skills;
}

