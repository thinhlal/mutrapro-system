package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi contract validation thất bại (payment percentages, milestone SLA days, etc.)
 */
public class ContractValidationException extends BusinessException {

    public ContractValidationException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_VALIDATION_ERROR, message);
    }

    public ContractValidationException(String message, Map<String, Object> details) {
        super(ProjectServiceErrorCodes.CONTRACT_VALIDATION_ERROR, message, details);
    }

    /**
     * Validation error cho payment percentages
     */
    public static ContractValidationException invalidPaymentPercentages(
            String depositPercent, String totalPaymentPercent, String milestonePaymentPercent) {
        return new ContractValidationException(
            String.format("Total payment percentage must equal 100%%. Current: %s%% (deposit: %s%% + milestones: %s%%)",
                totalPaymentPercent, depositPercent, milestonePaymentPercent),
            Map.of(
                "depositPercent", depositPercent,
                "totalPaymentPercent", totalPaymentPercent,
                "milestonePaymentPercent", milestonePaymentPercent
            )
        );
    }

    /**
     * Validation error cho milestone SLA days
     */
    public static ContractValidationException invalidMilestoneSlaDays(
            Integer contractSlaDays, Integer totalMilestoneSlaDays) {
        return new ContractValidationException(
            String.format("Total milestone SLA days must equal contract SLA days. Current: %d days (contract: %d days)",
                totalMilestoneSlaDays, contractSlaDays),
            Map.of(
                "contractSlaDays", contractSlaDays,
                "totalMilestoneSlaDays", totalMilestoneSlaDays
            )
        );
    }

    /**
     * Validation error khi milestone thiếu milestoneSlaDays
     */
    public static ContractValidationException missingMilestoneSlaDays(String milestoneName) {
        return new ContractValidationException(
            String.format("Milestone '%s' must have milestoneSlaDays greater than 0", milestoneName),
            Map.of("milestoneName", milestoneName)
        );
    }

    /**
     * Validation error khi deposit percent không hợp lệ
     */
    public static ContractValidationException invalidDepositPercent() {
        return new ContractValidationException(
            "Deposit percent is required and must be greater than 0"
        );
    }

    /**
     * Validation error khi milestone thiếu paymentPercent nhưng hasPayment = true
     */
    public static ContractValidationException missingPaymentPercent(String milestoneName) {
        return new ContractValidationException(
            String.format("Milestone '%s' has payment enabled but paymentPercent is missing or invalid", milestoneName),
            Map.of("milestoneName", milestoneName)
        );
    }

    /**
     * Validation error khi không có milestones
     */
    public static ContractValidationException noMilestones() {
        return new ContractValidationException(
            "At least one milestone is required"
        );
    }

    /**
     * Validation error khi contract SLA days không hợp lệ
     */
    public static ContractValidationException invalidContractSlaDays() {
        return new ContractValidationException(
            "Contract SLA days is required and must be greater than 0"
        );
    }
}

