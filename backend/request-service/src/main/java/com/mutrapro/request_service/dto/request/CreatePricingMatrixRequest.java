package com.mutrapro.request_service.dto.request;

import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.enums.UnitType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePricingMatrixRequest {
    
    @NotNull(message = "Service type is required")
    ServiceType serviceType;
    
    @NotNull(message = "Unit type is required")
    UnitType unitType;
    
    @NotNull(message = "Base price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Base price must be greater than 0")
    BigDecimal basePrice;
    
    CurrencyType currency;  // Optional, default VND
    
    String description;  // Optional
    
    Boolean isActive;  // Optional, default true
}

