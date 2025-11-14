package com.mutrapro.billing_service.dto.response;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.WalletTxType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class WalletTransactionResponse {
    
    String walletTxId;
    
    String walletId;
    
    WalletTxType txType;
    
    BigDecimal amount;
    
    CurrencyType currency;
    
    BigDecimal balanceBefore;
    
    BigDecimal balanceAfter;
    
    Map<String, Object> metadata;
    
    String contractId;
    
    String installmentId;
    
    String bookingId;
    
    String refundOfWalletTxId;
    
    Instant createdAt;
}

