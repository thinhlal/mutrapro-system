package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi arrangement milestones chưa được thanh toán trước khi tạo recording booking
 */
public class ArrangementMilestoneNotPaidException extends BusinessException {

    public ArrangementMilestoneNotPaidException(String message) {
        super(ProjectServiceErrorCodes.ARRANGEMENT_MILESTONE_NOT_PAID, message);
    }

    public static ArrangementMilestoneNotPaidException lastMilestoneNotPaid(int orderIndex) {
        return new ArrangementMilestoneNotPaidException(
            String.format("Cannot create booking for recording milestone. " +
                "All arrangement milestones must be paid (actualEndAt must be set) before creating booking. " +
                "Last arrangement milestone (orderIndex=%d) has not been paid yet (actualEndAt=null). " +
                "Please wait for customer to pay arrangement milestones before creating booking.",
                orderIndex)
        );
    }
}

