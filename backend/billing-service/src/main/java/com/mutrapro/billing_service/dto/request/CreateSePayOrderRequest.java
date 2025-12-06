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
public class CreateSePayOrderRequest {
    
    @NotNull(message = "Số tiền nạp không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền nạp tối thiểu là 1,000 VND")
    BigDecimal amount;
    
    CurrencyType currency;  // Optional, default VND
    
    String description;  // Mô tả đơn hàng (optional)
}

