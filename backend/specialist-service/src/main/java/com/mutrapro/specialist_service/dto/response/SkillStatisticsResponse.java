package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillStatisticsResponse {
    private Long total;        // Tổng số skills active
    private String topDemanded; // Skill được sử dụng nhiều nhất (skill name)
}

