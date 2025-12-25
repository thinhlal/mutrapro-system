package com.mutrapro.billing_service.dto.request;

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
public class AdjustWalletBalanceRequest {
    
    @NotNull(message = "Số tiền điều chỉnh không được để trống")
    BigDecimal amount;  // Có thể dương (thêm) hoặc âm (trừ)
    
    @NotBlank(message = "Lý do điều chỉnh không được để trống")
    String reason;  // Lý do điều chỉnh (bắt buộc để audit)
}

