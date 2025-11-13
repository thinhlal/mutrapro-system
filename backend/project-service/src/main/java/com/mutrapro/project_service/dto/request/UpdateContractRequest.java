package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class UpdateContractRequest {
    
    ContractType contractType;  // Optional, can be updated
    
    String termsAndConditions;  // Optional
    
    String specialClauses;  // Optional
    
    String notes;  // Optional
    
    // Pricing
    BigDecimal totalPrice;  // Optional
    
    CurrencyType currency;  // Optional
    
    BigDecimal depositPercent;  // Optional
    
    // Timeline & SLA
    Instant expectedStartDate;  // Optional
    
    Integer slaDays;  // Optional
    
    Boolean autoDueDate;  // Optional
    
    // Revision policy
    Integer freeRevisionsIncluded;  // Optional
    
    BigDecimal additionalRevisionFeeVnd;  // Optional
    
    Integer revisionDeadlineDays;  // Optional
    
    // Expiration
    Instant expiresAt;  // Optional
}

