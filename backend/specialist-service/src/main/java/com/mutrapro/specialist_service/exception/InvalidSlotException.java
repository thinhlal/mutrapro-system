package com.mutrapro.specialist_service.exception;

import com.mutrapro.specialist_service.enums.SpecialistServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception cho các lỗi liên quan đến slot validation
 * HTTP Status: 400 Bad Request
 */
public class InvalidSlotException extends BusinessException {
    
    private InvalidSlotException(SpecialistServiceErrorCodes errorCode, String message) {
        super(errorCode, message);
    }
    
    private InvalidSlotException(SpecialistServiceErrorCodes errorCode, String message, Map<String, Object> details) {
        super(errorCode, message, details);
    }
    
    /**
     * Khi slot không tồn tại
     */
    public static InvalidSlotException slotNotFound(String slotId) {
        return new InvalidSlotException(
            SpecialistServiceErrorCodes.SLOT_NOT_FOUND,
            "Slot not found",
            Map.of("slotId", slotId != null ? slotId : "unknown")
        );
    }
    
    /**
     * Khi startTime không align với grid
     */
    public static InvalidSlotException invalidStartTime(String startTime) {
        return new InvalidSlotException(
            SpecialistServiceErrorCodes.INVALID_SLOT_START_TIME,
            String.format("Invalid slot start time: %s. Must be one of: 08:00, 10:00, 12:00, 14:00, 16:00", startTime),
            Map.of("startTime", startTime != null ? startTime : "unknown",
                   "validStartTimes", "08:00, 10:00, 12:00, 14:00, 16:00")
        );
    }
    
    /**
     * Khi duration không phải bội số của 2h
     */
    public static InvalidSlotException invalidDuration(String startTime, String endTime) {
        return new InvalidSlotException(
            SpecialistServiceErrorCodes.INVALID_SLOT_DURATION,
            String.format("Invalid slot duration: %s to %s. Duration must be a multiple of 2 hours", startTime, endTime),
            Map.of("startTime", startTime != null ? startTime : "unknown",
                   "endTime", endTime != null ? endTime : "unknown",
                   "slotDurationHours", 2)
        );
    }
    
    /**
     * Khi date range không hợp lệ
     */
    public static InvalidSlotException invalidDateRange(String startDate, String endDate) {
        return new InvalidSlotException(
            SpecialistServiceErrorCodes.INVALID_DATE_RANGE,
            "Invalid date range. Start date must be before or equal to end date",
            Map.of("startDate", startDate != null ? startDate : "unknown",
                   "endDate", endDate != null ? endDate : "unknown")
        );
    }
    
    /**
     * Khi cố gắng update slot đã BOOKED
     */
    public static InvalidSlotException cannotUpdateBookedSlot(String slotId) {
        return new InvalidSlotException(
            SpecialistServiceErrorCodes.CANNOT_UPDATE_BOOKED_SLOT,
            "Cannot update slot with status BOOKED. Slot is already booked and cannot be changed",
            Map.of("slotId", slotId != null ? slotId : "unknown",
                   "currentStatus", "BOOKED")
        );
    }
}

