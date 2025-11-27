package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

/**
 * Exception khi không tìm thấy file
 */
public class FileNotFoundException extends ResourceNotFoundException {

    public FileNotFoundException(String fileId) {
        super(
            ProjectServiceErrorCodes.FILE_NOT_FOUND,
            String.format("File not found: %s", fileId)
        );
    }

    public FileNotFoundException(String fileId, Throwable cause) {
        super(
            ProjectServiceErrorCodes.FILE_NOT_FOUND,
            String.format("File not found: %s", fileId),
            cause
        );
    }

    public static FileNotFoundException byId(String fileId) {
        return new FileNotFoundException(fileId);
    }
}

