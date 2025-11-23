package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.InstallmentType;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi installment type không hợp lệ
 */
public class InvalidInstallmentTypeException extends BusinessException {

    public InvalidInstallmentTypeException(String message) {
        super(ProjectServiceErrorCodes.INVALID_INSTALLMENT_TYPE, message);
    }

    public InvalidInstallmentTypeException(String message, Map<String, Object> details) {
        super(ProjectServiceErrorCodes.INVALID_INSTALLMENT_TYPE, message, details);
    }

    /**
     * Error khi installment type không phải DEPOSIT nhưng đang cố thanh toán như DEPOSIT
     */
    public static InvalidInstallmentTypeException notDepositType(String installmentId, InstallmentType actualType) {
        return new InvalidInstallmentTypeException(
            String.format("Installment is not DEPOSIT type. Expected: DEPOSIT, Actual: %s", actualType),
            Map.of(
                "installmentId", installmentId != null ? installmentId : "unknown",
                "expectedType", "DEPOSIT",
                "actualType", actualType != null ? actualType.name() : "UNKNOWN"
            )
        );
    }
}

