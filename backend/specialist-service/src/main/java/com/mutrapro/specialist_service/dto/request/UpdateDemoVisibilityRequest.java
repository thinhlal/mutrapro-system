package com.mutrapro.specialist_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO để Admin cập nhật visibility của demo (is_public)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDemoVisibilityRequest {
    
    private Boolean isPublic;
}

