package com.mutrapro.billing_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

/**
 * Mirror of project-service milestone payment quote response.
 * Used by billing-service to charge the authoritative payable amount.
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
    String currency;

    BigDecimal baseAmount;
    BigDecimal lateDiscountPercent;
    BigDecimal lateDiscountAmount;
    BigDecimal payableAmount;

    Long lateHours;
    Integer graceHours;
    String policyVersion;

    LocalDateTime targetDeadline;
    LocalDateTime firstSubmissionAt;
    LocalDateTime computedAt;
}



