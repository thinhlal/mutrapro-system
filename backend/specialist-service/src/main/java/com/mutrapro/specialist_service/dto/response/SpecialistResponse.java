package com.mutrapro.specialist_service.dto.response;

import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO cho Specialist
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistResponse {
    
    private String specialistId;
    
    private String userId;
    
    private SpecialistType specialization;
    
    private SpecialistStatus status;
    
    private Integer experienceYears;
    
    private Integer maxConcurrentTasks;
    
    private String portfolioUrl;
    
    private String bio;
    
    private BigDecimal rating;
    
    private Integer totalProjects;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
}

