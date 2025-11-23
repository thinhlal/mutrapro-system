package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi milestone payment thất bại
 */
public class MilestonePaymentException extends BusinessException {

    public MilestonePaymentException(String message) {
        super(ProjectServiceErrorCodes.MILESTONE_PAYMENT_ERROR, message);
    }

    public MilestonePaymentException(String message, Map<String, Object> details) {
        super(ProjectServiceErrorCodes.MILESTONE_PAYMENT_ERROR, message, details);
    }

    /**
     * Error khi milestone chưa hoàn thành (work status không phải READY_FOR_PAYMENT hoặc COMPLETED)
     */
    public static MilestonePaymentException milestoneNotCompleted(String contractId, String milestoneId, 
            Integer orderIndex, MilestoneWorkStatus currentWorkStatus) {
        return new MilestonePaymentException(
            String.format("Milestone chỉ có thể thanh toán khi công việc đã hoàn thành (READY_FOR_PAYMENT hoặc COMPLETED). " +
                "Hiện tại work status: %s", currentWorkStatus),
            Map.of(
                "contractId", contractId,
                "milestoneId", milestoneId,
                "orderIndex", orderIndex,
                "currentWorkStatus", currentWorkStatus != null ? currentWorkStatus.name() : "UNKNOWN",
                "requiredWorkStatus", "READY_FOR_PAYMENT or COMPLETED"
            )
        );
    }
}

