package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

/**
 * Exception khi không tìm thấy task assignment
 */
public class TaskAssignmentNotFoundException extends ResourceNotFoundException {

    public TaskAssignmentNotFoundException(String assignmentId) {
        super(
            ProjectServiceErrorCodes.TASK_ASSIGNMENT_NOT_FOUND,
            String.format("Task assignment not found: %s", assignmentId)
        );
    }

    public TaskAssignmentNotFoundException(String assignmentId, Throwable cause) {
        super(
            ProjectServiceErrorCodes.TASK_ASSIGNMENT_NOT_FOUND,
            String.format("Task assignment not found: %s", assignmentId),
            cause
        );
    }

    public static TaskAssignmentNotFoundException byId(String assignmentId) {
        return new TaskAssignmentNotFoundException(assignmentId);
    }
}
