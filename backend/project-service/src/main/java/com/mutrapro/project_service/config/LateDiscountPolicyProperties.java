package com.mutrapro.project_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Configurable late discount policy for milestone payment (applied at pay time).
 *
 * Prefix: app.late-discount
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.late-discount")
public class LateDiscountPolicyProperties {

    /**
     * Policy version for audit/debug.
     */
    String policyVersion = "late_discount_v1";

    /**
     * Grace window in hours. Late is measured after (targetDeadline + graceHours).
     */
    Integer graceHours = 6;

    /**
     * Discount percent for late within 0-24 hours (inclusive).
     */
    BigDecimal tier0To24HoursPercent = new BigDecimal("5");

    /**
     * Discount percent for late within 24-72 hours (inclusive).
     */
    BigDecimal tier24To72HoursPercent = new BigDecimal("10");

    /**
     * Discount percent for late over 72 hours.
     */
    BigDecimal tierOver72HoursPercent = new BigDecimal("20");

    /**
     * Maximum discount percent (cap).
     */
    BigDecimal capPercent = new BigDecimal("20");
}


