package com.mutrapro.specialist_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO cho Specialist với đầy đủ thông tin (bao gồm skills và demos)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistDetailResponse {
    
    private SpecialistResponse specialist;
    
    private List<SpecialistSkillResponse> skills;
    
    private List<ArtistDemoResponse> demos;
}

