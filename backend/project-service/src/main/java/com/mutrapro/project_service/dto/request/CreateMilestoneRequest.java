package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.MilestoneBillingType;
import com.mutrapro.project_service.enums.MilestonePaymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class CreateMilestoneRequest {

    @NotBlank(message = "Name is required")
    String name;

    String description;  // Optional

    @NotNull(message = "Order index is required")
    @Positive(message = "Order index must be positive")
    Integer orderIndex;

    // Billing type và billingValue sẽ được BE tự động set mặc định (PERCENTAGE và paymentPercent hoặc 0)
    MilestoneBillingType billingType;  // Optional - BE sẽ set mặc định = PERCENTAGE

    BigDecimal billingValue;  // Optional - BE sẽ set mặc định = paymentPercent nếu hasPayment = true, hoặc 0

    @NotNull(message = "Payment status is required")
    MilestonePaymentStatus paymentStatus;

    // Payment configuration
    @NotNull(message = "Has payment is required")
    Boolean hasPayment;  // true nếu milestone này có thanh toán

    BigDecimal paymentPercent;  // Required nếu hasPayment = true, phần trăm thanh toán cho milestone này

    @Positive(message = "Milestone SLA days must be positive")
    Integer milestoneSlaDays;  // SLA ngày cho milestone này (BE sẽ tính plannedStartAt và plannedDueDate khi contract có start date)
}

