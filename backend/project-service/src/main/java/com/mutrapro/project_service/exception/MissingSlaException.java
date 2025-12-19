package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi milestone thiếu SLA days để tính toán due date
 */
public class MissingSlaException extends BusinessException {

    public MissingSlaException(String message) {
        super(ProjectServiceErrorCodes.MISSING_SLA, message);
    }

    public static MissingSlaException forRecordingMilestone() {
        return new MissingSlaException(
            "Recording milestone must have SLA days to calculate due date"
        );
    }
}

