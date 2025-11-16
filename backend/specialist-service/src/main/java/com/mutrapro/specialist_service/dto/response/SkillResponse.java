package com.mutrapro.specialist_service.dto.response;

import com.mutrapro.specialist_service.enums.RecordingCategory;
import com.mutrapro.specialist_service.enums.SkillType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO cho Skill
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillResponse {
    
    private String skillId;
    
    private String skillName;
    
    private SkillType skillType;
    
    /**
     * Category cho Recording Artist skills (optional)
     * Chỉ có giá trị khi skillType = RECORDING_ARTIST
     */
    private RecordingCategory recordingCategory;
    
    private String description;
    
    private Boolean isActive;
    
    private LocalDateTime createdAt;
}

