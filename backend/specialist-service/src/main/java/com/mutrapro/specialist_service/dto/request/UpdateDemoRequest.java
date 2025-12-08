package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.RecordingRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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
    
    /**
     * Recording role của demo này: VOCALIST hoặc INSTRUMENT_PLAYER
     */
    private RecordingRole recordingRole;
    
    /**
     * Skill mà demo này thể hiện:
     * - Nếu recordingRole = VOCALIST: vocal skill (Soprano, Alto, etc.) - optional
     * - Nếu recordingRole = INSTRUMENT_PLAYER: instrument skill (Piano Performance, etc.) - bắt buộc
     */
    private String skillId;
    
    /**
     * Tags theo genre: ['Pop', 'Ballad', 'Rock', 'R&B']
     */
    private List<String> genres;
    
    private String previewUrl;
    
    /**
     * Specialist tự chọn demo là public hay private
     * true = public (customer có thể xem), false = private (chỉ specialist xem)
     */
    private Boolean isPublic;
    
    /**
     * Đánh dấu demo này là demo chính (hiển thị ở avatar trong list)
     * Nếu set true, các demo khác sẽ tự động set false
     */
    private Boolean isMainDemo;
}

