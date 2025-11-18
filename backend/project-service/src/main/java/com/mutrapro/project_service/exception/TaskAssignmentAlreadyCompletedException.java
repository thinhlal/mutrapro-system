package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi task assignment đã completed và không thể modify
 */
public class TaskAssignmentAlreadyCompletedException extends BusinessException {

    public TaskAssignmentAlreadyCompletedException(String message) {
        super(ProjectServiceErrorCodes.TASK_ASSIGNMENT_ALREADY_COMPLETED, message);
    }

    public TaskAssignmentAlreadyCompletedException(String message, String assignmentId) {
        super(ProjectServiceErrorCodes.TASK_ASSIGNMENT_ALREADY_COMPLETED, message,
              Map.of("assignmentId", assignmentId != null ? assignmentId : "unknown"));
    }

    public static TaskAssignmentAlreadyCompletedException cannotUpdate(String assignmentId) {
        return new TaskAssignmentAlreadyCompletedException(
            "Cannot update task assignment: Assignment is already completed",
            assignmentId
        );
    }

    public static TaskAssignmentAlreadyCompletedException cannotDelete(String assignmentId) {
        return new TaskAssignmentAlreadyCompletedException(
            "Cannot delete task assignment: Assignment is already completed",
            assignmentId
        );
    }
}

