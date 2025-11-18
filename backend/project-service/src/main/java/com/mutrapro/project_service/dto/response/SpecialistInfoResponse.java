package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO để nhận thông tin specialist từ specialist-service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistInfoResponse {
    private String specialistId;
    private String userId;
    private String specialization;
    private String status;
}

