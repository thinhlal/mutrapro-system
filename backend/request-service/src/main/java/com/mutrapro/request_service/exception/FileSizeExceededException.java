package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file size vượt quá giới hạn cho phép
 */
public class FileSizeExceededException extends BusinessException {

    public FileSizeExceededException(String message) {
        super(RequestServiceErrorCodes.FILE_SIZE_EXCEEDED, message);
    }

    public FileSizeExceededException(String message, String maxSize) {
        super(RequestServiceErrorCodes.FILE_SIZE_EXCEEDED, message, "maxSize", maxSize);
    }

    public static FileSizeExceededException create(long maxSizeMB) {
        return new FileSizeExceededException(
            "File size exceeds maximum allowed size: " + maxSizeMB + "MB",
            maxSizeMB + "MB"
        );
    }
}

