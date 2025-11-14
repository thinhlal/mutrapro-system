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
import java.time.Instant;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class CreateInstallmentsRequest {
    
    @NotBlank(message = "Contract ID không được để trống")
    String contractId;
    
    @NotNull(message = "Deposit amount không được để trống")
    @DecimalMin(value = "0.01", message = "Deposit amount phải lớn hơn 0")
    BigDecimal depositAmount;
    
    @NotNull(message = "Final amount không được để trống")
    @DecimalMin(value = "0.01", message = "Final amount phải lớn hơn 0")
    BigDecimal finalAmount;
    
    @Builder.Default
    CurrencyType currency = CurrencyType.VND;
    
    Instant expectedStartDate;  // Ngày bắt đầu dự kiến (dùng cho deposit due_date)
    
    Instant dueDate;  // Ngày hết hạn (dùng cho final due_date)
}

