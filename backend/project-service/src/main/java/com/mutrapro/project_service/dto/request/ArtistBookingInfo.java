package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class ArtistBookingInfo {
    @NotBlank(message = "Specialist ID is required")
    String specialistId;  // ID của artist (vocal specialist)
    
    String role;  // Optional - role của artist (VOCALIST, GUITARIST, etc.)
    
    Boolean isPrimary;  // Optional - true nếu là artist chính (vocal chính)
    
    BigDecimal artistFee;  // Optional - phí cho artist này
    
    String skillId;  // Optional - skill được sử dụng
}

