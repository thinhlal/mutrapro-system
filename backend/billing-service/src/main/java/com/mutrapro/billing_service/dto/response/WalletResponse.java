package com.mutrapro.billing_service.dto.response;

import com.mutrapro.billing_service.enums.CurrencyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class WalletResponse {
    
    String walletId;
    
    String userId;
    
    BigDecimal balance;
    
    BigDecimal holdBalance;  // Số tiền đang bị hold (cho withdrawal requests)
    
    BigDecimal availableBalance;  // Số dư khả dụng (balance - holdBalance)
    
    CurrencyType currency;
    
    LocalDateTime createdAt;
}

