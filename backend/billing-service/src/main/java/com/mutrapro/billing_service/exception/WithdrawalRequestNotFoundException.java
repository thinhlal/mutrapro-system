package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy withdrawal request
 */
public class WithdrawalRequestNotFoundException extends ResourceNotFoundException {

    public WithdrawalRequestNotFoundException(String message) {
        super(BillingServiceErrorCodes.WITHDRAWAL_REQUEST_NOT_FOUND, message);
    }

    public WithdrawalRequestNotFoundException(String message, String withdrawalRequestId) {
        super(BillingServiceErrorCodes.WITHDRAWAL_REQUEST_NOT_FOUND, message, 
              Map.of("withdrawalRequestId", withdrawalRequestId != null ? withdrawalRequestId : "unknown"));
    }
    
    public static WithdrawalRequestNotFoundException byId(String withdrawalRequestId) {
        return new WithdrawalRequestNotFoundException(
            "Withdrawal request not found with id: " + withdrawalRequestId,
            withdrawalRequestId
        );
    }
}

