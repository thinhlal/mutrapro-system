package com.mutrapro.billing_service.dto.request;

import com.mutrapro.billing_service.enums.CurrencyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class PayRevisionFeeRequest {
    
    @NotNull(message = "Số tiền trừ không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền trừ phải lớn hơn 0")
    BigDecimal amount;
    
    CurrencyType currency;  // Optional, default VND
    
    @NotBlank(message = "Contract ID không được để trống")
    String contractId;
    
    String milestoneId;  // Optional
    
    @NotBlank(message = "Task Assignment ID không được để trống")
    String taskAssignmentId;  // Required - để tạo revision request
    
    String submissionId;  // Optional - original submission ID
    
    Integer revisionRound;  // Optional - revision round number
    
    String requestedByUserId;  // Optional - customer user ID who requested revision
    
    String title;  // Optional - title của revision request
    
    String description;  // Optional - description của revision request
}

