package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file type không hợp lệ cho task type
 */
public class InvalidFileTypeForTaskException extends BusinessException {

    public InvalidFileTypeForTaskException(String message) {
        super(ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK, message);
    }

    public InvalidFileTypeForTaskException(String message, String taskType, String fileType) {
        super(ProjectServiceErrorCodes.INVALID_FILE_TYPE_FOR_TASK, message);
    }

    public static InvalidFileTypeForTaskException taskTypeRequired() {
        return new InvalidFileTypeForTaskException("Task type is required for file validation");
    }

    public static InvalidFileTypeForTaskException unknownTaskType(String taskType) {
        return new InvalidFileTypeForTaskException(
            String.format("Unknown task type: %s", taskType)
        );
    }

    public static InvalidFileTypeForTaskException notAllowed(String fileType, String taskType, String allowedTypes) {
        return new InvalidFileTypeForTaskException(
            String.format(
                "File type '%s' is not allowed for task type '%s'. Only %s are allowed.",
                fileType, taskType, allowedTypes
            )
        );
    }
}

