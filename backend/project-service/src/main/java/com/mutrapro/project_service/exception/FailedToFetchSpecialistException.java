package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi không thể fetch thông tin specialist từ identity service
 */
public class FailedToFetchSpecialistException extends BusinessException {

    public FailedToFetchSpecialistException(String specialistId, String message) {
        super(
            ProjectServiceErrorCodes.FAILED_TO_FETCH_SPECIALIST,
            String.format("Failed to fetch specialist info for ID %s: %s", specialistId, message)
        );
    }

    public FailedToFetchSpecialistException(String specialistId, String message, Throwable cause) {
        super(
            ProjectServiceErrorCodes.FAILED_TO_FETCH_SPECIALIST,
            String.format("Failed to fetch specialist info for ID %s: %s", specialistId, message),
            cause
        );
    }

    public static FailedToFetchSpecialistException create(String specialistId, String message) {
        return new FailedToFetchSpecialistException(specialistId, message);
    }

    public static FailedToFetchSpecialistException create(String specialistId, String message, Throwable cause) {
        return new FailedToFetchSpecialistException(specialistId, message, cause);
    }
}

