package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy contract installment
 */
public class ContractInstallmentNotFoundException extends ResourceNotFoundException {

    public ContractInstallmentNotFoundException(String message) {
        super(BillingServiceErrorCodes.INSTALLMENT_NOT_FOUND, message);
    }

    public ContractInstallmentNotFoundException(String message, String contractId) {
        super(BillingServiceErrorCodes.INSTALLMENT_NOT_FOUND, message, 
              Map.of("contractId", contractId != null ? contractId : "unknown"));
    }
    
    public static ContractInstallmentNotFoundException byContractId(String contractId) {
        return new ContractInstallmentNotFoundException(
            "Pending deposit installment not found for contract: " + contractId,
            contractId
        );
    }
    
    public static ContractInstallmentNotFoundException byInstallmentId(String installmentId) {
        return new ContractInstallmentNotFoundException(
            "Installment not found with id: " + installmentId,
            null
        );
    }
}

