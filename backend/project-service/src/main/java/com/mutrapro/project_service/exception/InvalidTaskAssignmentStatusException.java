package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi task assignment status không hợp lệ cho action được yêu cầu
 */
public class InvalidTaskAssignmentStatusException extends BusinessException {

    public InvalidTaskAssignmentStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_TASK_ASSIGNMENT_STATUS, message);
    }

    public InvalidTaskAssignmentStatusException(String message, String assignmentId, AssignmentStatus currentStatus) {
        super(ProjectServiceErrorCodes.INVALID_TASK_ASSIGNMENT_STATUS, message,
              Map.of("assignmentId", assignmentId,
                     "currentStatus", currentStatus.toString()));
    }

    public static InvalidTaskAssignmentStatusException cannotAccept(String assignmentId, AssignmentStatus currentStatus) {
        return new InvalidTaskAssignmentStatusException(
            String.format("Task assignment cannot be accepted. Current status: %s", currentStatus),
            assignmentId,
            currentStatus
        );
    }

    public static InvalidTaskAssignmentStatusException cannotStart(String assignmentId, AssignmentStatus currentStatus) {
        return new InvalidTaskAssignmentStatusException(
            String.format("Task assignment cannot be started. Current status: %s", currentStatus),
            assignmentId,
            currentStatus
        );
    }

    public static InvalidTaskAssignmentStatusException cannotCancel(String assignmentId, AssignmentStatus currentStatus) {
        return new InvalidTaskAssignmentStatusException(
            String.format("Task assignment cannot be cancelled. Current status: %s", currentStatus),
            assignmentId,
            currentStatus
        );
    }

    public static InvalidTaskAssignmentStatusException cannotReportIssue(String assignmentId, AssignmentStatus currentStatus) {
        return new InvalidTaskAssignmentStatusException(
            String.format("Task assignment cannot report issue. Current status: %s", currentStatus),
            assignmentId,
            currentStatus
        );
    }

    public static InvalidTaskAssignmentStatusException cannotSubmitForReview(String assignmentId, AssignmentStatus currentStatus) {
        return new InvalidTaskAssignmentStatusException(
            String.format("Task assignment cannot be submitted for review. Current status: %s", currentStatus),
            assignmentId,
            currentStatus
        );
    }

    public static InvalidTaskAssignmentStatusException cannotDeleteFile(String assignmentId, AssignmentStatus currentStatus) {
        return new InvalidTaskAssignmentStatusException(
            String.format("Cannot delete file. Task status must be in_progress or revision_requested. Current status: %s", currentStatus),
            assignmentId,
            currentStatus
        );
    }
}

