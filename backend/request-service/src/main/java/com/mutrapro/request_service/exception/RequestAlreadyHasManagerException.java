package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi service request đã có manager được assign rồi
 */
public class RequestAlreadyHasManagerException extends BusinessException {

    public RequestAlreadyHasManagerException(String message) {
        super(RequestServiceErrorCodes.REQUEST_ALREADY_HAS_MANAGER, message);
    }

    public static RequestAlreadyHasManagerException create(String requestId, String existingManagerId) {
        return new RequestAlreadyHasManagerException(
            String.format("Service request '%s' already has manager '%s' assigned", 
                    requestId, existingManagerId)
        );
    }
}

