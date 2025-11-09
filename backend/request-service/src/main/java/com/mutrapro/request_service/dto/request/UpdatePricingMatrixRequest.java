package com.mutrapro.request_service.dto.request;

import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.UnitType;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePricingMatrixRequest {
    
    UnitType unitType;  // Optional
    
    @DecimalMin(value = "0.0", inclusive = false, message = "Base price must be greater than 0")
    BigDecimal basePrice;  // Optional
    
    CurrencyType currency;  // Optional
    
    String description;  // Optional
    
    Boolean isActive;  // Optional
}

