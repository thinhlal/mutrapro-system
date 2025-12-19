package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi không tìm thấy arrangement milestone trong contract
 */
public class ArrangementMilestoneNotFoundException extends BusinessException {

    public ArrangementMilestoneNotFoundException(String message) {
        super(ProjectServiceErrorCodes.ARRANGEMENT_MILESTONE_NOT_FOUND, message);
    }

    public static ArrangementMilestoneNotFoundException inContract(String contractId) {
        return new ArrangementMilestoneNotFoundException(
            "Arrangement milestone not found in arrangement_with_recording contract"
        );
    }
}

