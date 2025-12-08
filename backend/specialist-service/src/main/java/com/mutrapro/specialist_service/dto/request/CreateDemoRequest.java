package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.RecordingRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Request DTO để Specialist tạo demo
 * 
 * Demo là một track, gắn tag:
 * - recordingRole: VOCALIST hoặc INSTRUMENT_PLAYER (bắt buộc)
 * - skillId: 
 *   - Nếu VOCALIST: vocal skill (Soprano, Alto, etc.) - optional
 *   - Nếu INSTRUMENT_PLAYER: instrument skill (Piano Performance, etc.) - bắt buộc
 * - genres: ['Pop', 'Ballad', 'Rock'] - ít nhất 1 genre (bắt buộc)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDemoRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    private String description;
    
    /**
     * Recording role của demo này: VOCALIST hoặc INSTRUMENT_PLAYER
     * Bắt buộc
     */
    @NotNull(message = "Recording role is required")
    private RecordingRole recordingRole;
    
    /**
     * Skill mà demo này thể hiện:
     * - Nếu recordingRole = VOCALIST: vocal skill (Soprano, Alto, etc.) - optional
     * - Nếu recordingRole = INSTRUMENT_PLAYER: instrument skill (Piano Performance, etc.) - bắt buộc
     */
    private String skillId;
    
    /**
     * Tags theo genre: ['Pop', 'Ballad', 'Rock', 'R&B']
     * Ít nhất phải có 1 genre (bắt buộc)
     */
    @NotEmpty(message = "At least one genre is required")
    @Builder.Default
    private List<String> genres = new ArrayList<>();
    
    /**
     * Public URL của demo file (từ upload)
     * Khi upload file, backend trả về public URL, lưu vào previewUrl trong entity
     */
    @NotBlank(message = "File URL is required")
    private String previewUrl;
    
    /**
     * Specialist tự chọn demo là public hay private
     * true = public (customer có thể xem), false = private (chỉ specialist xem)
     */
    @Builder.Default
    private Boolean isPublic = false;
    
    /**
     * Đánh dấu demo này là demo chính (hiển thị ở avatar trong list)
     * Nếu set true, các demo khác sẽ tự động set false
     */
    @Builder.Default
    private Boolean isMainDemo = false;
}

