package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.MilestoneBillingType;
import com.mutrapro.project_service.enums.MilestonePaymentStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class ContractMilestoneResponse {
    
    String milestoneId;
    
    String contractId;
    
    String name;
    
    String description;
    
    Integer orderIndex;
    
    MilestoneWorkStatus workStatus;
    
    MilestoneBillingType billingType;
    
    BigDecimal billingValue;
    
    BigDecimal amount;
    
    MilestonePaymentStatus paymentStatus;
    
    LocalDateTime plannedDueDate;
    
    Instant paidAt;
    
    Instant createdAt;
    
    Instant updatedAt;
}

