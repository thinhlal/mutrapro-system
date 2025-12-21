package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class UpdateStudioRequest {
    
    @NotBlank(message = "Studio name is required")
    String studioName;
    
    @NotBlank(message = "Location is required")
    String location;
    
    @NotNull(message = "Hourly rate is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Hourly rate must be greater than 0")
    BigDecimal hourlyRate;
    
    @NotNull(message = "Free external guests limit is required")
    @Min(value = 0, message = "Free external guests limit must be >= 0")
    Integer freeExternalGuestsLimit;
    
    @NotNull(message = "Extra guest fee per person is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Extra guest fee per person must be >= 0")
    BigDecimal extraGuestFeePerPerson;
    
    Boolean isActive;
}

