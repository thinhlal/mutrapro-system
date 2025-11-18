package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi task type không hợp lệ cho contract type
 */
public class InvalidTaskTypeException extends BusinessException {

    public InvalidTaskTypeException(String message) {
        super(ProjectServiceErrorCodes.INVALID_TASK_TYPE, message);
    }

    public InvalidTaskTypeException(String message, TaskType taskType, String contractType) {
        super(ProjectServiceErrorCodes.INVALID_TASK_TYPE, message,
              Map.of(
                  "taskType", taskType != null ? taskType.toString() : "unknown",
                  "contractType", contractType != null ? contractType : "unknown"
              ));
    }

    public static InvalidTaskTypeException create(TaskType taskType, String contractType) {
        return new InvalidTaskTypeException(
            "Task type " + taskType + " is not valid for contract type " + contractType,
            taskType,
            contractType
        );
    }
}

