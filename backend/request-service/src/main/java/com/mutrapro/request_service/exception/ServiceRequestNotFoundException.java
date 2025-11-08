package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy service request
 */
public class ServiceRequestNotFoundException extends ResourceNotFoundException {

    public ServiceRequestNotFoundException(String message) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message);
    }

    public ServiceRequestNotFoundException(String message, String requestId) {
        super(RequestServiceErrorCodes.RESOURCE_NOT_FOUND, message, 
              Map.of("requestId", requestId));
    }

    public static ServiceRequestNotFoundException byId(String requestId) {
        return new ServiceRequestNotFoundException(
            "Service request not found with ID: " + requestId,
            requestId
        );
    }
}

