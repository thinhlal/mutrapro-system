package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi contract type không hợp lệ cho operation được yêu cầu
 */
public class InvalidContractTypeException extends BusinessException {

    public InvalidContractTypeException(String message) {
        super(ProjectServiceErrorCodes.INVALID_CONTRACT_TYPE, message);
    }

    public static InvalidContractTypeException notArrangementWithRecording(String contractId) {
        return new InvalidContractTypeException(
            String.format("Contract %s is not an arrangement_with_recording contract", contractId)
        );
    }
}

