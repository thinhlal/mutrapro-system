package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi milestone ID không hợp lệ (blank)
 */
public class InvalidMilestoneIdException extends BusinessException {

    public InvalidMilestoneIdException(String message) {
        super(ProjectServiceErrorCodes.INVALID_MILESTONE_ID, message);
    }

    public static InvalidMilestoneIdException cannotBeBlank() {
        return new InvalidMilestoneIdException("Milestone ID cannot be blank");
    }
}

