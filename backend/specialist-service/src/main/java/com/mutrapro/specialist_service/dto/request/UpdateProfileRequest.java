package com.mutrapro.specialist_service.dto.request;

import com.mutrapro.specialist_service.enums.Gender;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO để Specialist cập nhật profile của mình
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    
    private String portfolioUrl;
    
    private String bio; // Giới thiệu bản thân
    
    private Integer experienceYears;
    
    // ===== RECORDING ARTIST SPECIFIC FIELDS =====
    // Các field này chỉ áp dụng khi specialization = RECORDING_ARTIST
    
    private String avatarUrl; // URL to profile image
    
    private Gender gender; // MALE, FEMALE, OTHER
    
    private List<String> genres; // Array of music genres: ['Pop', 'Rock', 'Jazz', 'Classical', 'R&B', 'Hip-Hop', 'Electronic', etc.]
    
    private List<String> credits; // Array of credits: ['One Seven Music', 'Future House Cloud']
}

