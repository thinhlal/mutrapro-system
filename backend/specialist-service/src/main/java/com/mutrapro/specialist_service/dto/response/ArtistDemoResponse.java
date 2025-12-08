package com.mutrapro.specialist_service.dto.response;

import com.mutrapro.specialist_service.enums.RecordingRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
    
    /**
     * Recording role của demo này: VOCALIST hoặc INSTRUMENT_PLAYER
     */
    private RecordingRole recordingRole;
    
    /**
     * Skill mà demo này thể hiện:
     * - Nếu recordingRole = VOCALIST: vocal skill (Soprano, Alto, etc.)
     * - Nếu recordingRole = INSTRUMENT_PLAYER: instrument skill (Piano Performance, etc.)
     */
    private SkillResponse skill;
    
    /**
     * Tags theo genre: ['Pop', 'Ballad', 'Rock', 'R&B']
     */
    @Builder.Default
    private List<String> genres = new ArrayList<>();
    
    /**
     * Public URL của demo file (từ S3 public folder)
     * Customer có thể xem/nghe trực tiếp
     */
    private String previewUrl;
    
    private Boolean isPublic;
    
    /**
     * Demo chính - được hiển thị ở avatar trong trang list specialists
     */
    private Boolean isMainDemo;
    
    private LocalDateTime createdAt;
}

