package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO cho ArtistDemo
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArtistDemoResponse {
    
    private String demoId;
    
    private String specialistId;
    
    private String title;
    
    private String description;
    
    private SkillResponse skill;
    
    private String fileId;
    
    private String previewUrl;
    
    private Boolean isPublic;
    
    private Integer demoOrder;
    
    private Boolean isFeatured;
    
    private Integer viewCount;
    
    private BigDecimal customerRating;
    
    private LocalDateTime lastPlayedAt;
    
    private LocalDateTime createdAt;
}

