package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.time.LocalTime;
import java.util.Map;

/**
 * Exception khi time range không hợp lệ
 */
public class InvalidTimeRangeException extends BusinessException {

    public InvalidTimeRangeException(String message) {
        super(ProjectServiceErrorCodes.INVALID_TIME_RANGE, message);
    }

    public InvalidTimeRangeException(String message, LocalTime startTime, LocalTime endTime) {
        super(ProjectServiceErrorCodes.INVALID_TIME_RANGE, message,
              Map.of("startTime", startTime != null ? startTime.toString() : "unknown",
                     "endTime", endTime != null ? endTime.toString() : "unknown"));
    }

    public static InvalidTimeRangeException startAfterEnd(LocalTime startTime, LocalTime endTime) {
        return new InvalidTimeRangeException(
            String.format("Start time (%s) must be before end time (%s)", startTime, endTime),
            startTime,
            endTime
        );
    }

    public static InvalidTimeRangeException startEqualsEnd(LocalTime startTime, LocalTime endTime) {
        return new InvalidTimeRangeException(
            String.format("Start time (%s) must be before end time (%s), they cannot be equal", startTime, endTime),
            startTime,
            endTime
        );
    }
}

