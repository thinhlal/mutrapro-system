package com.mutrapro.specialist_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Specialist cập nhật profile của mình
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    
    private String portfolioUrl;
    
    private String bio; // Giới thiệu bản thân
    
    private Integer experienceYears;
}

