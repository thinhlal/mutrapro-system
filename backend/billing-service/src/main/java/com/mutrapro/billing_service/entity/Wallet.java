package com.mutrapro.billing_service.entity;

import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Entity
@Table(name = "wallets", indexes = {
    @Index(name = "idx_wallets_user_id", columnList = "user_id", unique = true),
    @Index(name = "idx_wallets_currency", columnList = "currency")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Wallet extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "wallet_id", nullable = false)
    String walletId;

    @Column(name = "user_id", nullable = false, unique = true)
    String userId;  // Soft reference to identity-service

    @Builder.Default
    @Column(name = "balance", nullable = false, precision = 14, scale = 2)
    BigDecimal balance = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "hold_balance", nullable = false, precision = 14, scale = 2)
    BigDecimal holdBalance = BigDecimal.ZERO;  // Số tiền đang bị hold (cho withdrawal requests)

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 10)
    CurrencyType currency = CurrencyType.VND;

    /**
     * Tính số dư khả dụng (available = balance - holdBalance)
     */
    public BigDecimal getAvailableBalance() {
        return balance.subtract(holdBalance);
    }
}

