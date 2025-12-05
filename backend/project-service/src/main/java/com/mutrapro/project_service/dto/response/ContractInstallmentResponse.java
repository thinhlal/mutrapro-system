package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.CurrencyType;
import com.mutrapro.project_service.enums.GateCondition;
import com.mutrapro.project_service.enums.InstallmentStatus;
import com.mutrapro.project_service.enums.InstallmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class ContractInstallmentResponse {
    
    String installmentId;
    
    String contractId;
    
    InstallmentType type;
    
    String milestoneId;
    
    String label;
    
    BigDecimal percent;
    
    LocalDateTime dueDate;
    
    BigDecimal amount;
    
    CurrencyType currency;
    
    InstallmentStatus status;
    
    GateCondition gateCondition;
    
    LocalDateTime paidAt;
    
    LocalDateTime createdAt;
    
    LocalDateTime updatedAt;
}

