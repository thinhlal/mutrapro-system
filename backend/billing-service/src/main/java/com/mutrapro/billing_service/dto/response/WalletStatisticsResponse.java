package com.mutrapro.billing_service.dto.response;

import com.mutrapro.billing_service.enums.WalletTxType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Simple aggregate statistics for admin billing dashboard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletStatisticsResponse {

    /**
     * Total number of wallets in the system.
     */
    private long totalWallets;

    /**
     * Sum of balances across all wallets (in VND).
     */
    private BigDecimal totalBalance;

    /**
     * Total number of wallet transactions.
     */
    private long totalTransactions;

    /**
     * Breakdown of transaction counts by type.
     */
    private Map<WalletTxType, Long> transactionsByType;
}


