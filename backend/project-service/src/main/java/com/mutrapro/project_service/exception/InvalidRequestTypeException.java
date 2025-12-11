package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi service request type không hợp lệ cho booking
 */
public class InvalidRequestTypeException extends BusinessException {

    public InvalidRequestTypeException(String message) {
        super(ProjectServiceErrorCodes.INVALID_REQUEST_TYPE, message);
    }

    public InvalidRequestTypeException(String message, String requestId, String requestType) {
        super(ProjectServiceErrorCodes.INVALID_REQUEST_TYPE, message,
              Map.of("requestId", requestId != null ? requestId : "unknown",
                     "requestType", requestType != null ? requestType : "unknown"));
    }

    public static InvalidRequestTypeException forBooking(String requestId, String requestType) {
        return new InvalidRequestTypeException(
            String.format("Service request type must be 'recording' for booking, but got: %s", requestType),
            requestId,
            requestType
        );
    }
}

