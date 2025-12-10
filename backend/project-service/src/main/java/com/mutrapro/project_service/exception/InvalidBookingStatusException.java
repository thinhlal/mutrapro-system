package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi booking status không hợp lệ cho action được yêu cầu
 */
public class InvalidBookingStatusException extends BusinessException {

    public InvalidBookingStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_BOOKING_STATUS, message);
    }

    public InvalidBookingStatusException(String message, String bookingId, BookingStatus currentStatus) {
        super(ProjectServiceErrorCodes.INVALID_BOOKING_STATUS, message);
    }

    /**
     * Không thể upload file khi booking status không hợp lệ
     */
    public static InvalidBookingStatusException cannotUploadFile(String bookingId, BookingStatus currentStatus) {
        return new InvalidBookingStatusException(
            String.format("Cannot upload file for recording_supervision task. " +
                "Studio booking status must be CONFIRMED, IN_PROGRESS, or COMPLETED. " +
                "Current status: %s. BookingId: %s",
                currentStatus, bookingId)
        );
    }

    /**
     * Không thể submit file khi booking đã bị cancelled hoặc no-show
     */
    public static InvalidBookingStatusException cannotSubmitFiles(String bookingId, BookingStatus currentStatus) {
        return new InvalidBookingStatusException(
            String.format("Cannot submit files for recording_supervision task. " +
                "Studio booking has been cancelled or marked as no-show. " +
                "Current status: %s. BookingId: %s",
                currentStatus, bookingId)
        );
    }
}

