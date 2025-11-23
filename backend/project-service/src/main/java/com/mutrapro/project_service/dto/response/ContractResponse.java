package com.mutrapro.project_service.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    
    Instant expiresAt;
    
    String fileId;
    
    String notes;
    
    // Pricing
    BigDecimal totalPrice;
    
    CurrencyType currency;
    
    BigDecimal depositPercent;
    
    // Timeline & SLA
    Instant expectedStartDate;
    
    Instant dueDate;
    
    Integer slaDays;
    
    Boolean autoDueDate;
    
    // Revision policy
    Integer freeRevisionsIncluded;
    
    BigDecimal additionalRevisionFeeVnd;
    
    Integer revisionDeadlineDays;  // Number of days after delivery for free revisions
    
    // Snapshot contact info
    String nameSnapshot;
    
    String phoneSnapshot;
    
    String emailSnapshot;
    
    // E-Signature fields
    @JsonProperty("bSignatureS3Url")
    String bSignatureS3Url;  // Customer signature S3 URL
    
    @JsonProperty("bSignedAt")
    Instant bSignedAt;  // When customer actually signed
    
    LocalDateTime updatedAt;
    
    // Customer action reason
    String cancellationReason;
    
    // Milestones
    List<ContractMilestoneResponse> milestones;
    
    // Installments
    List<ContractInstallmentResponse> installments;
}

