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
public class CreateContractRequest {
    
    String requestId;  // Required: Service request ID
    
    ContractType contractType;  // Required
    
    String termsAndConditions;
    
    String specialClauses;
    
    String notes;
    
    // Pricing
    BigDecimal totalPrice;  // Required
    
    CurrencyType currency;  // Required
    
    BigDecimal depositPercent;  // Default 40
    
    // Timeline & SLA
    Instant expectedStartDate;
    
    Integer slaDays;  // Default based on contract type
    
    Boolean autoDueDate;  // Default true
    
    // Revision policy
    Integer freeRevisionsIncluded;  // Default 1
    
    BigDecimal additionalRevisionFeeVnd;
    
    Integer revisionDeadlineDays;  // Default based on contract type (30/45/60 days)
    
    // Expiration
    Instant expiresAt;
}

