package com.mutrapro.billing_service.dto.request;

import com.mutrapro.billing_service.enums.CurrencyType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class PayMilestoneRequest {
    
    CurrencyType currency;  // Optional, default VND
    
    @NotBlank(message = "Contract ID không được để trống")
    String contractId;
    
    @NotBlank(message = "Milestone ID không được để trống")
    String milestoneId;
    
    @NotBlank(message = "Installment ID không được để trống")
    String installmentId;
    
    Integer orderIndex;  // Optional, milestone order index (1, 2, 3...)
}

