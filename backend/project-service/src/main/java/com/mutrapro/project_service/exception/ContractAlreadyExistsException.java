package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi contract đã tồn tại cho request
 */
public class ContractAlreadyExistsException extends BusinessException {

    public ContractAlreadyExistsException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_ALREADY_EXISTS, message);
    }

    public ContractAlreadyExistsException(String message, String requestId) {
        super(ProjectServiceErrorCodes.CONTRACT_ALREADY_EXISTS, message, 
              Map.of("requestId", requestId));
    }

    public static ContractAlreadyExistsException forRequest(String requestId) {
        return new ContractAlreadyExistsException(
            String.format("Contract already exists for request: %s", requestId),
            requestId
        );
    }
}

