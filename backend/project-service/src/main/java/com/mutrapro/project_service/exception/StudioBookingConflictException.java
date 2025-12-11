package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

/**
 * Exception khi studio đã được book trong time slot đó
 */
public class StudioBookingConflictException extends BusinessException {

    public StudioBookingConflictException(String message) {
        super(ProjectServiceErrorCodes.STUDIO_BOOKING_CONFLICT, message);
    }

    public StudioBookingConflictException(String message, LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        super(ProjectServiceErrorCodes.STUDIO_BOOKING_CONFLICT, message,
              Map.of("bookingDate", bookingDate != null ? bookingDate.toString() : "unknown",
                     "startTime", startTime != null ? startTime.toString() : "unknown",
                     "endTime", endTime != null ? endTime.toString() : "unknown"));
    }

    public static StudioBookingConflictException forTimeSlot(LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        return new StudioBookingConflictException(
            String.format("Studio is already booked at the requested time slot: %s to %s on %s",
                startTime, endTime, bookingDate),
            bookingDate,
            startTime,
            endTime
        );
    }
}

