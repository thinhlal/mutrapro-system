package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

public class TaskAssignmentAlreadyActiveException extends BusinessException {

    private TaskAssignmentAlreadyActiveException(String milestoneId) {
        super(
            ProjectServiceErrorCodes.TASK_ASSIGNMENT_ALREADY_COMPLETED,
            "Milestone already has an active task",
            "milestoneId",
            milestoneId
        );
    }

    public static TaskAssignmentAlreadyActiveException forMilestone(String milestoneId) {
        return new TaskAssignmentAlreadyActiveException(milestoneId);
    }
}

