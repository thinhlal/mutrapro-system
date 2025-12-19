package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.time.LocalDate;

/**
 * Exception khi booking date nằm ngoài SLA range hợp lệ
 */
public class InvalidBookingDateException extends BusinessException {

    public InvalidBookingDateException(String message) {
        super(ProjectServiceErrorCodes.INVALID_BOOKING_DATE, message);
    }

    public static InvalidBookingDateException outsideSlaRange(LocalDate bookingDate, LocalDate validStartDate, LocalDate validDueDate) {
        return new InvalidBookingDateException(
            String.format("Booking date %s must be within recording milestone SLA range: %s to %s (calculated from arrangement completion date)",
                bookingDate, validStartDate, validDueDate)
        );
    }
}

