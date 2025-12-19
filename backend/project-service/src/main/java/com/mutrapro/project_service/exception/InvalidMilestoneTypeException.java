package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi milestone type không hợp lệ cho operation được yêu cầu
 */
public class InvalidMilestoneTypeException extends BusinessException {

    public InvalidMilestoneTypeException(String message) {
        super(ProjectServiceErrorCodes.INVALID_MILESTONE_TYPE, message);
    }

    public static InvalidMilestoneTypeException notRecording(String milestoneId) {
        return new InvalidMilestoneTypeException(
            String.format("Milestone %s is not a recording milestone", milestoneId)
        );
    }
}

