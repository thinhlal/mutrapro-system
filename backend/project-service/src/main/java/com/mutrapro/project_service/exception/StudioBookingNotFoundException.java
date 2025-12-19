package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi không tìm thấy studio booking
 */
public class StudioBookingNotFoundException extends BusinessException {

    public StudioBookingNotFoundException(String message) {
        super(ProjectServiceErrorCodes.STUDIO_BOOKING_NOT_FOUND, message);
    }

    public static StudioBookingNotFoundException forRequestId(String requestId) {
        return new StudioBookingNotFoundException(
            "Studio booking not found for requestId: " + requestId
        );
    }
}

