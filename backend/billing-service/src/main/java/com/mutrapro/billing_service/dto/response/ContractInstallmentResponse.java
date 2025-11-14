package com.mutrapro.billing_service.dto.response;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.GateCondition;
import com.mutrapro.billing_service.enums.InstallmentStatus;
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
public class ContractInstallmentResponse {
    
    String installmentId;
    String contractId;
    String label;
    Instant dueDate;
    BigDecimal amount;
    CurrencyType currency;
    InstallmentStatus status;
    Boolean isDeposit;
    String milestoneId;
    GateCondition gateCondition;
    BigDecimal appliedCreditAmount;
    LocalDateTime createdAt;
    Instant paidAt;
}

