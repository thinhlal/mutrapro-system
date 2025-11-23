package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy contract installment
 */
public class ContractInstallmentNotFoundException extends ResourceNotFoundException {

    public ContractInstallmentNotFoundException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_INSTALLMENT_NOT_FOUND, message);
    }

    public ContractInstallmentNotFoundException(String message, String installmentId, String contractId) {
        super(ProjectServiceErrorCodes.CONTRACT_INSTALLMENT_NOT_FOUND, message, 
              Map.of(
                  "installmentId", installmentId != null ? installmentId : "unknown",
                  "contractId", contractId != null ? contractId : "unknown"
              ));
    }

    public static ContractInstallmentNotFoundException byId(String installmentId) {
        return new ContractInstallmentNotFoundException(
            "Contract installment not found: installmentId=" + installmentId,
            installmentId,
            null
        );
    }

    public static ContractInstallmentNotFoundException byId(String installmentId, String contractId) {
        return new ContractInstallmentNotFoundException(
            "Contract installment not found: installmentId=" + installmentId + ", contractId=" + contractId,
            installmentId,
            contractId
        );
    }

    public static ContractInstallmentNotFoundException forMilestone(String milestoneId, String contractId) {
        return new ContractInstallmentNotFoundException(
            "Contract installment not found for milestone: milestoneId=" + milestoneId + ", contractId=" + contractId,
            null,
            contractId
        );
    }
}

