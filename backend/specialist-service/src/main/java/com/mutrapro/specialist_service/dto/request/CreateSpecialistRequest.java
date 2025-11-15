package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.SpecialistType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Admin tạo specialist mới
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSpecialistRequest {
    
    @NotNull(message = "Email is required")
    @Email(message = "Email format is invalid")
    private String email;
    
    @NotNull(message = "Specialization is required")
    private SpecialistType specialization;
    
    @Positive(message = "Max concurrent tasks must be positive")
    private Integer maxConcurrentTasks;
}

