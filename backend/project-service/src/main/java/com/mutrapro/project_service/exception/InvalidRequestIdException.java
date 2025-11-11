package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi requestId không hợp lệ hoặc thiếu
 */
public class InvalidRequestIdException extends BusinessException {

    public InvalidRequestIdException(String message) {
        super(ProjectServiceErrorCodes.INVALID_REQUEST_ID, message);
    }

    public InvalidRequestIdException(String message, Map<String, Object> details) {
        super(ProjectServiceErrorCodes.INVALID_REQUEST_ID, message, details);
    }

    public static InvalidRequestIdException required() {
        return new InvalidRequestIdException(
            "Request ID is required to create a contract. Contract can only be created from Service Request Management page.");
    }

    public static InvalidRequestIdException mismatch(String pathRequestId, String bodyRequestId) {
        return new InvalidRequestIdException(
            String.format("Request ID in request body (%s) must match path parameter (%s)", 
                bodyRequestId, pathRequestId),
            Map.of("pathRequestId", pathRequestId, "bodyRequestId", bodyRequestId));
    }
}

