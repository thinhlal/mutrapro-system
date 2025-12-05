package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Exception khi contract đã hết hạn và không thể ký
 */
public class ContractExpiredException extends BusinessException {

    public ContractExpiredException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_EXPIRED, message);
    }

    public ContractExpiredException(String message, String contractId, LocalDateTime expiresAt) {
        super(ProjectServiceErrorCodes.CONTRACT_EXPIRED, message,
              Map.of("contractId", contractId,
                     "expiresAt", expiresAt.toString()));
    }

    public static ContractExpiredException cannotSign(String contractId, LocalDateTime expiresAt) {
        return new ContractExpiredException(
            String.format("Cannot sign expired contract. Contract expired at: %s", expiresAt),
            contractId,
            expiresAt
        );
    }
}

