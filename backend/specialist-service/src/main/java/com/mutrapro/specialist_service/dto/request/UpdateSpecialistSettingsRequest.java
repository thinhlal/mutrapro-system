package com.mutrapro.specialist_service.dto.request;

import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Admin cập nhật max_concurrent_tasks
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSpecialistSettingsRequest {
    
    @Positive(message = "Max concurrent tasks must be positive")
    private Integer maxConcurrentTasks;
}

