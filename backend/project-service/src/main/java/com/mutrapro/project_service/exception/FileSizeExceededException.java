package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file size vượt quá giới hạn cho phép
 */
public class FileSizeExceededException extends BusinessException {

    public FileSizeExceededException(String message) {
        super(ProjectServiceErrorCodes.FILE_SIZE_EXCEEDED, message);
    }

    public FileSizeExceededException(String message, String maxSize) {
        super(ProjectServiceErrorCodes.FILE_SIZE_EXCEEDED, message, "maxSize", maxSize);
    }

    public static FileSizeExceededException create(long maxSizeMB) {
        return new FileSizeExceededException(
            "File size exceeds maximum allowed size: " + maxSizeMB + "MB",
            maxSizeMB + "MB"
        );
    }
}

