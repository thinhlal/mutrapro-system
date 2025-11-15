package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.SpecialistStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Admin cập nhật status của specialist
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSpecialistStatusRequest {
    
    @NotNull(message = "Status is required")
    private SpecialistStatus status;
}

