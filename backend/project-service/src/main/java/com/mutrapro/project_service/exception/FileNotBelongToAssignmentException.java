package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file không thuộc về assignment được chỉ định
 */
public class FileNotBelongToAssignmentException extends BusinessException {

    public FileNotBelongToAssignmentException(String fileId, String assignmentId) {
        super(
            ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK,
            String.format("File %s does not belong to assignment %s", fileId, assignmentId)
        );
    }

    public static FileNotBelongToAssignmentException create(String fileId, String assignmentId) {
        return new FileNotBelongToAssignmentException(fileId, assignmentId);
    }
}

