package com.mutrapro.project_service.dto.request;

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
public class CreateInstallmentsRequest {
    
    String contractId;
    BigDecimal depositAmount;
    BigDecimal finalAmount;
    CurrencyType currency;
    Instant expectedStartDate;
    Instant dueDate;
}

