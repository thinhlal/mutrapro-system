package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Exception khi arrangement milestones chưa được completed trước khi tạo recording booking
 */
public class ArrangementMilestoneNotCompletedException extends BusinessException {

    public ArrangementMilestoneNotCompletedException(String message) {
        super(ProjectServiceErrorCodes.ARRANGEMENT_MILESTONE_NOT_COMPLETED, message);
    }

    public static ArrangementMilestoneNotCompletedException withUnacceptedMilestones(
            List<String> unacceptedMilestoneDetails) {
        String details = unacceptedMilestoneDetails.stream()
            .collect(Collectors.joining(", "));
        return new ArrangementMilestoneNotCompletedException(
            String.format("All arrangement milestones must be completed before creating booking for recording. " +
                "Unaccepted arrangement milestones: %s", details)
        );
    }
}

