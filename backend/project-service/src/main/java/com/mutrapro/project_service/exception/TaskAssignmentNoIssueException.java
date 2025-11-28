package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi task assignment không có issue để resolve
 */
public class TaskAssignmentNoIssueException extends BusinessException {

    public TaskAssignmentNoIssueException(String assignmentId) {
        super(
            ProjectServiceErrorCodes.TASK_ASSIGNMENT_NO_ISSUE,
            String.format("Task assignment %s does not have an issue to resolve", assignmentId)
        );
    }

    public static TaskAssignmentNoIssueException create(String assignmentId) {
        return new TaskAssignmentNoIssueException(assignmentId);
    }
}

