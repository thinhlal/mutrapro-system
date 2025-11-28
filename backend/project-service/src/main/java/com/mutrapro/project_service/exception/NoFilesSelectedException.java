package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi không có files được chọn để thực hiện action
 */
public class NoFilesSelectedException extends BusinessException {

    public NoFilesSelectedException(String message) {
        super(ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK, message);
    }

    public static NoFilesSelectedException forSubmission() {
        return new NoFilesSelectedException("No files selected to submit for review");
    }

    public static NoFilesSelectedException notFound() {
        return new NoFilesSelectedException("No files found with the provided file IDs");
    }
}

