package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.billing_service.enums.WithdrawalStatus;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi withdrawal request có status không hợp lệ cho operation
 */
public class InvalidWithdrawalStatusException extends BusinessException {

    public InvalidWithdrawalStatusException(String message) {
        super(BillingServiceErrorCodes.INVALID_WITHDRAWAL_STATUS, message);
    }

    public InvalidWithdrawalStatusException(String message, String withdrawalRequestId, WithdrawalStatus currentStatus, WithdrawalStatus[] expectedStatuses) {
        super(BillingServiceErrorCodes.INVALID_WITHDRAWAL_STATUS, message, 
              Map.of(
                  "withdrawalRequestId", withdrawalRequestId != null ? withdrawalRequestId : "unknown",
                  "currentStatus", currentStatus != null ? currentStatus.name() : "unknown",
                  "expectedStatuses", expectedStatuses != null ? String.join(", ", java.util.Arrays.stream(expectedStatuses).map(Enum::name).toArray(String[]::new)) : "unknown"
              ));
    }
    
    public static InvalidWithdrawalStatusException forOperation(String withdrawalRequestId, WithdrawalStatus currentStatus, WithdrawalStatus... expectedStatuses) {
        String expectedStr = expectedStatuses != null && expectedStatuses.length > 0 
            ? String.join(" or ", java.util.Arrays.stream(expectedStatuses).map(Enum::name).toArray(String[]::new))
            : "unknown";
        return new InvalidWithdrawalStatusException(
            String.format("Withdrawal request is not in valid status for this operation. Current status: %s, expected: %s", 
                currentStatus != null ? currentStatus.name() : "unknown", expectedStr),
            withdrawalRequestId, currentStatus, expectedStatuses
        );
    }
}

