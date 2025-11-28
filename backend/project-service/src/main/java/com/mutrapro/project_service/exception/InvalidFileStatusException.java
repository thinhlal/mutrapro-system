package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.FileStatus;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file status không hợp lệ cho action được yêu cầu
 */
public class InvalidFileStatusException extends BusinessException {

    public InvalidFileStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK, message);
    }

    public InvalidFileStatusException(String message, String fileId, FileStatus currentStatus) {
        super(ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK, message);
    }

    public static InvalidFileStatusException cannotApprove(String fileId, FileStatus currentStatus) {
        return new InvalidFileStatusException(
            String.format("Cannot approve file with status: %s. File must be uploaded or pending_review.", 
                    currentStatus)
        );
    }

    public static InvalidFileStatusException cannotReject(String fileId, FileStatus currentStatus) {
        return new InvalidFileStatusException(
            String.format("Cannot reject file with status: %s. File must be uploaded or pending_review.", 
                    currentStatus)
        );
    }

    public static InvalidFileStatusException cannotDeliver(String fileId, FileStatus currentStatus) {
        return new InvalidFileStatusException(
            String.format("Cannot deliver file with status: %s. File must be approved first.", 
                    currentStatus)
        );
    }

    public static InvalidFileStatusException cannotDelete(String fileId, FileStatus currentStatus) {
        return new InvalidFileStatusException(
            String.format("Cannot delete file with status: %s. Only uploaded files can be deleted.", 
                    currentStatus)
        );
    }

    public static InvalidFileStatusException cannotSubmit(String fileId, FileStatus currentStatus) {
        return new InvalidFileStatusException(
            String.format("File %s has status %s. Only uploaded files can be submitted.", 
                    fileId, currentStatus)
        );
    }

    public static InvalidFileStatusException fileDeleted(String fileId) {
        return new InvalidFileStatusException(
            String.format("File %s has been deleted and cannot be submitted", fileId)
        );
    }
}

