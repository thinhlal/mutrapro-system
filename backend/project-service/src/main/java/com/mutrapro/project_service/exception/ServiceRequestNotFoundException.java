package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy service request
 */
public class ServiceRequestNotFoundException extends ResourceNotFoundException {

    public ServiceRequestNotFoundException(String message) {
        super(ProjectServiceErrorCodes.SERVICE_REQUEST_NOT_FOUND, message);
    }

    public ServiceRequestNotFoundException(String message, String requestId) {
        super(ProjectServiceErrorCodes.SERVICE_REQUEST_NOT_FOUND, message, 
              Map.of("requestId", requestId));
    }

    public static ServiceRequestNotFoundException byId(String requestId) {
        return new ServiceRequestNotFoundException(
            "Service request not found with ID: " + requestId,
            requestId
        );
    }
}

