package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.project_service.enums.RevisionRequestStatus;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi state của entity không hợp lệ cho operation được yêu cầu
 */
public class InvalidStateException extends BusinessException {

    public InvalidStateException(String message) {
        super(ProjectServiceErrorCodes.INVALID_STATE, message);
    }

    public static InvalidStateException noFiles(String entityName) {
        return new InvalidStateException(String.format("%s has no files", entityName));
    }

    public static InvalidStateException notPendingManagerReview(String revisionRequestId, String currentStatus) {
        return new InvalidStateException(
            String.format("Revision request is not pending manager review. Current status: %s", currentStatus)
        );
    }

    public static InvalidStateException cannotReject(String revisionRequestId, RevisionRequestStatus currentStatus) {
        return new InvalidStateException(
            String.format("Cannot reject revision request %s. Current status: %s. Only PENDING_MANAGER_REVIEW or APPROVED_PENDING_DELIVERY can be rejected.", 
                revisionRequestId, currentStatus)
        );
    }

    /**
     * Không thể start recording_supervision task khi chưa có studio booking
     */
    public static InvalidStateException missingStudioBookingForRecordingTask(String assignmentId, String milestoneId) {
        return new InvalidStateException(
            String.format("Cannot start recording supervision task without studio booking. " +
                "TaskAssignmentId: %s, MilestoneId: %s. " +
                "Please ensure a studio booking is created and linked to this task before starting work.",
                assignmentId, milestoneId)
        );
    }

    /**
     * Không thể activate recording milestone khi chưa có studio booking cho recording task
     */
    public static InvalidStateException missingStudioBookingForRecordingMilestone(String milestoneId, String assignmentId) {
        return new InvalidStateException(
            String.format("Cannot activate recording milestone without studio booking linked to recording task. " +
                "MilestoneId: %s, TaskAssignmentId: %s. " +
                "Please create a studio booking for this milestone first, then update the task's studioBookingId.",
                milestoneId, assignmentId)
        );
    }
}

