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
public class WithdrawWalletRequest {
    
    @NotNull(message = "Số tiền rút không được để trống")
    @DecimalMin(value = "10000", message = "Số tiền rút tối thiểu là 10,000 VND")
    BigDecimal amount;
    
    CurrencyType currency;  // Optional, default VND
    
    @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
    String bankAccountNumber;
    
    @NotBlank(message = "Tên ngân hàng không được để trống")
    String bankName;
    
    @NotBlank(message = "Tên chủ tài khoản không được để trống")
    String accountHolderName;
    
    String note;  // Optional - Ghi chú cho yêu cầu rút tiền
}

