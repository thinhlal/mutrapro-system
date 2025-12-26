package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
    LocalDateTime expectedStartDate;  // Optional
    
    Integer slaDays;  // Optional
    
    // Revision policy
    Integer freeRevisionsIncluded;  // Optional
    
    BigDecimal additionalRevisionFeeVnd;  // Optional
    
    Integer revisionDeadlineDays;  // Optional
    
    // Expiration
    LocalDateTime expiresAt;  // Optional
    
    // Milestones (optional - có thể update milestones khi contract ở status DRAFT)
    List<CreateMilestoneRequest> milestones;
}

