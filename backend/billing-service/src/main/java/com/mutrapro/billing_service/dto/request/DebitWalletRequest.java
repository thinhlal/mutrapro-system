package com.mutrapro.billing_service.dto.request;

import com.mutrapro.billing_service.enums.CurrencyType;
import jakarta.validation.constraints.DecimalMin;
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
public class DebitWalletRequest {
    
    @NotNull(message = "Số tiền trừ không được để trống")
    @DecimalMin(value = "0.01", message = "Số tiền trừ phải lớn hơn 0")
    BigDecimal amount;
    
    CurrencyType currency;  // Optional, default VND
    
    String paymentId;  // Optional, reference to payment
    
    String contractId;  // Optional, for audit trail
    
    String milestoneId;  // Optional, for milestone payment
    
    Integer orderIndex;  // Optional, milestone order index (1, 2, 3...)
    
    String bookingId;  // Optional, for audit trail
}

