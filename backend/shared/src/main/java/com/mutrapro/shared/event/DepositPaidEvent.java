package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepositPaidEvent implements Serializable {

    private UUID eventId;

    private String contractId;
    private String installmentId;  // ID của DEPOSIT installment
    private Instant paidAt;
    private BigDecimal amount;
    private String currency;  // VND, USD, etc.
    private Instant timestamp;
}

