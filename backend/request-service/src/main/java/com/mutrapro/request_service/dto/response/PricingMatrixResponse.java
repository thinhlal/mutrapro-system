package com.mutrapro.request_service.dto.response;

import com.mutrapro.request_service.enums.CurrencyType;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.enums.UnitType;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PricingMatrixResponse {
    String pricingId;
    ServiceType serviceType;
    UnitType unitType;
    BigDecimal basePrice;
    CurrencyType currency;
    String description;
    boolean isActive;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

