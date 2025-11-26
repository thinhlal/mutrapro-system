package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi milestone work status không hợp lệ cho việc tạo task assignment
 */
public class InvalidMilestoneWorkStatusException extends BusinessException {

    public InvalidMilestoneWorkStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_MILESTONE_WORK_STATUS, message);
    }

    public InvalidMilestoneWorkStatusException(String message, String milestoneId, MilestoneWorkStatus currentStatus) {
        super(ProjectServiceErrorCodes.INVALID_MILESTONE_WORK_STATUS, message,
              Map.of(
                  "milestoneId", milestoneId != null ? milestoneId : "unknown",
                  "currentStatus", currentStatus != null ? currentStatus.toString() : "unknown"
              ));
    }

    public static InvalidMilestoneWorkStatusException cannotCreateTask(String milestoneId, MilestoneWorkStatus currentStatus) {
        return new InvalidMilestoneWorkStatusException(
            String.format("Cannot create task assignment: Milestone work status must be PLANNED, READY_TO_START hoặc IN_PROGRESS. " +
                "Current milestone work status: %s (milestoneId: %s)", 
                currentStatus, milestoneId),
            milestoneId,
            currentStatus
        );
    }
}

