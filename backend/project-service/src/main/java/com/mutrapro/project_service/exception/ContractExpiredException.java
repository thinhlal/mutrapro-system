package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * Exception khi contract đã hết hạn và không thể ký
 */
public class ContractExpiredException extends BusinessException {

    public ContractExpiredException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_EXPIRED, message);
    }

    public ContractExpiredException(String message, UUID contractId, Instant expiresAt) {
        super(ProjectServiceErrorCodes.CONTRACT_EXPIRED, message,
              Map.of("contractId", contractId.toString(),
                     "expiresAt", expiresAt.toString()));
    }

    public ContractExpiredException(String message, String contractId, Instant expiresAt) {
        super(ProjectServiceErrorCodes.CONTRACT_EXPIRED, message,
              Map.of("contractId", contractId,
                     "expiresAt", expiresAt.toString()));
    }

    public static ContractExpiredException cannotSign(UUID contractId, Instant expiresAt) {
        return new ContractExpiredException(
            String.format("Cannot sign expired contract. Contract expired at: %s", expiresAt),
            contractId,
            expiresAt
        );
    }

    public static ContractExpiredException cannotSign(String contractId, Instant expiresAt) {
        return new ContractExpiredException(
            String.format("Cannot sign expired contract. Contract expired at: %s", expiresAt),
            contractId,
            expiresAt
        );
    }
}

