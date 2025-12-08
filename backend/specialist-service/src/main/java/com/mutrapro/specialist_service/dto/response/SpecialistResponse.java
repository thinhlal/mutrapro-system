package com.mutrapro.specialist_service.dto.response;

import com.mutrapro.specialist_service.enums.Gender;
import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO cho Specialist
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistResponse {
    
    private String specialistId;
    
    private String userId;
    
    private SpecialistType specialization;
    
    private SpecialistStatus status;
    
    private Integer experienceYears;
    
    private Integer maxConcurrentTasks;
    
    private Integer totalOpenTasks;
    
    private Integer tasksInSlaWindow;
    
    private String portfolioUrl;
    
    private String bio;
    
    private BigDecimal rating;
    
    private Integer totalProjects;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private String fullName;
    
    private String email;
    
    // ===== RECORDING ARTIST SPECIFIC FIELDS =====
    
    private String avatarUrl;
    
    private Gender gender;
    
    private List<RecordingRole> recordingRoles; // Array of roles: [VOCALIST], [INSTRUMENT_PLAYER], hoặc cả 2
    
    private List<String> genres; // Array of music genres: ['Pop', 'Rock', 'Jazz', etc.]
    
    private List<String> credits;
    
    private Integer reviews;
    
    /**
     * URL của main demo (demo được đánh dấu là demo chính)
     * Được hiển thị ở avatar trong trang list specialists
     */
    private String mainDemoPreviewUrl;
}

