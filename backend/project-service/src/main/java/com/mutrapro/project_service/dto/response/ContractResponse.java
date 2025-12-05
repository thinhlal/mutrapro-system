package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.CurrencyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class ContractResponse {
    
    String contractId;
    
    String requestId;
    
    String userId;
    
    String managerUserId;
    
    String contractNumber;
    
    ContractType contractType;
    
    String termsAndConditions;
    
    String specialClauses;
    
    ContractStatus status;
    
    LocalDateTime createdAt;
    
    Instant sentToCustomerAt;
    
    Instant customerReviewedAt;
    
    Instant signedAt;
    
    Instant depositPaidAt;
    
    Instant workStartAt;
    
    Instant expiresAt;
    
    String fileId;
    
    String notes;
    
    // Pricing
    BigDecimal totalPrice;
    
    CurrencyType currency;
    
    BigDecimal depositPercent;
    
    // Timeline & SLA
    Instant expectedStartDate;
    
    Integer slaDays;
    
    // Revision policy
    Integer freeRevisionsIncluded;
    
    BigDecimal additionalRevisionFeeVnd;
    
    Integer revisionDeadlineDays;  // Số ngày SLA để team hoàn thành revision sau khi manager approve
    
    // Snapshot contact info
    String nameSnapshot;
    
    String phoneSnapshot;
    
    String emailSnapshot;
    
    // E-Signature fields
    Instant customerSignedAt;  // When customer actually signed
    
    LocalDateTime updatedAt;
    
    // Customer action reason
    String cancellationReason;
    
    // Milestones
    List<ContractMilestoneResponse> milestones;
    
    // Installments
    List<ContractInstallmentResponse> installments;
}

