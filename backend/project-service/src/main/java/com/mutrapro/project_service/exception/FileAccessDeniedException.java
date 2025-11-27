package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi user không có quyền truy cập file
 */
public class FileAccessDeniedException extends BusinessException {

    public FileAccessDeniedException(String fileId, String userId) {
        super(
            ProjectServiceErrorCodes.FILE_ACCESS_DENIED,
            String.format("User %s does not have permission to access file %s", userId, fileId)
        );
    }

    public FileAccessDeniedException(String message) {
        super(
            ProjectServiceErrorCodes.FILE_ACCESS_DENIED,
            message
        );
    }

    public static FileAccessDeniedException create(String fileId, String userId) {
        return new FileAccessDeniedException(fileId, userId);
    }

    public static FileAccessDeniedException withMessage(String message) {
        return new FileAccessDeniedException(message);
    }
}

