package com.mutrapro.project_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

/**
 * Payment quote for a milestone installment.
 * Used to show late discount breakdown at Pay time and to let billing-service charge the correct amount.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class MilestonePaymentQuoteResponse {

    String contractId;
    String milestoneId;
    String installmentId;

    String currency; // e.g. "VND"

    // Baseline installment amount (before late discount)
    BigDecimal baseAmount;

    // Late discount breakdown (nullable when not applicable)
    BigDecimal lateDiscountPercent;
    BigDecimal lateDiscountAmount;

    // Final amount customer should pay (baseAmount - lateDiscountAmount)
    BigDecimal payableAmount;

    Long lateHours;      // hours late after grace (can be null)
    Integer graceHours;  // policy grace window (hours)
    String policyVersion;

    // Debug context for UI/explanations (optional)
    LocalDateTime targetDeadline;
    LocalDateTime firstSubmissionAt;

    LocalDateTime computedAt;
}


