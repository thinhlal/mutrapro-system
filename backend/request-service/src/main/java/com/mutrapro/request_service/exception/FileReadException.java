package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi đọc file thất bại
 */
public class FileReadException extends BusinessException {

    public FileReadException(String message) {
        super(RequestServiceErrorCodes.FILE_READ_ERROR, message);
    }

    public FileReadException(String message, Throwable cause) {
        super(RequestServiceErrorCodes.FILE_READ_ERROR, message, cause);
    }

    public static FileReadException create(String message, Throwable cause) {
        return new FileReadException("Error reading file: " + message, cause);
    }
}

