package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistStatisticsResponse {
    private Long active;   // Số specialists active (status = ACTIVE)
    private Long inactive; // Số specialists inactive (status = INACTIVE hoặc SUSPENDED)
}

