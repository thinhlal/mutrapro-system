package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi request status không hợp lệ cho action được yêu cầu
 * Ví dụ: Không thể tạo contract khi request đã cancelled/completed/rejected
 */
public class InvalidRequestStatusException extends BusinessException {

    public InvalidRequestStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_REQUEST_STATUS, message);
    }

    public InvalidRequestStatusException(String message, String requestId, String currentStatus) {
        super(ProjectServiceErrorCodes.INVALID_REQUEST_STATUS, message,
              Map.of("requestId", requestId,
                     "currentStatus", currentStatus));
    }

    public static InvalidRequestStatusException cannotCreateContract(String requestId, String currentStatus) {
        return new InvalidRequestStatusException(
            String.format("Cannot create contract: Service request is already %s", currentStatus),
            requestId,
            currentStatus
        );
    }
}

