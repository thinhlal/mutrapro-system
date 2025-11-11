package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;
import java.util.UUID;

/**
 * Exception khi contract đã được ký và không thể thay đổi
 */
public class ContractAlreadySignedException extends BusinessException {

    public ContractAlreadySignedException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_ALREADY_SIGNED, message);
    }

    public ContractAlreadySignedException(String message, UUID contractId) {
        super(ProjectServiceErrorCodes.CONTRACT_ALREADY_SIGNED, message,
              Map.of("contractId", contractId.toString()));
    }

    public ContractAlreadySignedException(String message, String contractId) {
        super(ProjectServiceErrorCodes.CONTRACT_ALREADY_SIGNED, message,
              Map.of("contractId", contractId));
    }

    public static ContractAlreadySignedException cannotExpire(UUID contractId) {
        return new ContractAlreadySignedException(
            "Cannot expire a signed contract",
            contractId
        );
    }

    public static ContractAlreadySignedException cannotExpire(String contractId) {
        return new ContractAlreadySignedException(
            "Cannot expire a signed contract",
            contractId
        );
    }
}

