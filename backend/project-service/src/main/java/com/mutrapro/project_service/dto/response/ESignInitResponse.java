package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ESignInitResponse {
    
    private String sessionId;
    private String message;
    private LocalDateTime expireAt;
    private Integer maxAttempts;
}

