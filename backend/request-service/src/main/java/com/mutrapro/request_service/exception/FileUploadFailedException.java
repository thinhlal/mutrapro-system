package com.mutrapro.request_service.exception;

import com.mutrapro.request_service.enums.RequestServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi upload file thất bại
 */
public class FileUploadFailedException extends BusinessException {

    public FileUploadFailedException(String message) {
        super(RequestServiceErrorCodes.FILE_UPLOAD_FAILED, message);
    }

    public FileUploadFailedException(String message, Throwable cause) {
        super(RequestServiceErrorCodes.FILE_UPLOAD_FAILED, message, cause);
    }

    public static FileUploadFailedException create(String message) {
        return new FileUploadFailedException("Failed to upload file: " + message);
    }

    public static FileUploadFailedException create(String message, Throwable cause) {
        return new FileUploadFailedException("Failed to upload file: " + message, cause);
    }
}

