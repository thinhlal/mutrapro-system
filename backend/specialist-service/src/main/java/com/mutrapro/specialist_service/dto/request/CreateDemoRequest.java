package com.mutrapro.specialist_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Specialist tạo demo
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDemoRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    
    private String skillId;
    
    @NotBlank(message = "File ID is required")
    private String fileId;
    
    private String previewUrl;
    
    private Integer demoOrder;
}

