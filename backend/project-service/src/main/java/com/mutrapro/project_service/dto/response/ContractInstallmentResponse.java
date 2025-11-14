package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.CurrencyType;
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
    String status;  // pending, paid, overdue, cancelled
    Boolean isDeposit;
    String milestoneId;
    String gateCondition;  // before_start, after_accept, after_delivery
    BigDecimal appliedCreditAmount;
    LocalDateTime createdAt;
    Instant paidAt;
}

