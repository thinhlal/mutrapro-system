package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SpecialistType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO để Admin tạo specialist mới
 * Chỉ chứa các field cơ bản cần thiết khi tạo.
 * Các field khác (bio, portfolioUrl, experienceYears, genres, gender, credits, avatarUrl) 
 * sẽ do specialist tự cập nhật sau qua profile service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSpecialistRequest {
    
    @NotNull(message = "Email is required")
    @Email(message = "Email format is invalid")
    private String email;
    
    @NotNull(message = "Specialization is required")
    private SpecialistType specialization;
    
    @Positive(message = "Max concurrent tasks must be positive")
    private Integer maxConcurrentTasks;
    
    // ===== RECORDING ARTIST SPECIFIC FIELDS =====
    
    /**
     * Recording roles - BẮT BUỘC khi specialization = RECORDING_ARTIST
     * Admin set trực tiếp khi tạo specialist (sau khi phỏng vấn)
     * Có thể là [VOCALIST], [INSTRUMENT_PLAYER], hoặc cả 2
     */
    @Size(min = 1, message = "Recording roles must have at least one role when specialization is RECORDING_ARTIST")
    private List<RecordingRole> recordingRoles; // Array of roles: [VOCALIST], [INSTRUMENT_PLAYER], hoặc cả 2 (BẮT BUỘC khi specialization = RECORDING_ARTIST)
}

