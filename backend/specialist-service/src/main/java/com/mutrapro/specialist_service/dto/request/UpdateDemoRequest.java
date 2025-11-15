package com.mutrapro.specialist_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Specialist cập nhật demo
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDemoRequest {
    
    private String title;
    
    private String description;
    
    private String skillId;
    
    private String previewUrl;
    
    private Integer demoOrder;
}

