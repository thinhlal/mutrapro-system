package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi upload file thất bại
 */
public class FileUploadException extends BusinessException {

    public FileUploadException(String message) {
        super(ProjectServiceErrorCodes.FILE_UPLOAD_ERROR, message);
    }

    public FileUploadException(String message, Throwable cause) {
        super(ProjectServiceErrorCodes.FILE_UPLOAD_ERROR, message, cause);
    }

    public static FileUploadException failed(String fileName, String errorMessage) {
        return new FileUploadException(
            String.format("Failed to upload file %s: %s", fileName, errorMessage)
        );
    }

    public static FileUploadException failed(String fileName, String errorMessage, Throwable cause) {
        return new FileUploadException(
            String.format("Failed to upload file %s: %s", fileName, errorMessage),
            cause
        );
    }
}

