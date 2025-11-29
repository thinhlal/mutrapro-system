package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.project_service.enums.SubmissionStatus;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi submission status không hợp lệ cho action được yêu cầu
 */
public class InvalidSubmissionStatusException extends BusinessException {

    public InvalidSubmissionStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_SUBMISSION_STATUS, message);
    }

    public InvalidSubmissionStatusException(String message, String submissionId, SubmissionStatus currentStatus) {
        super(ProjectServiceErrorCodes.INVALID_SUBMISSION_STATUS, message,
              Map.of("submissionId", submissionId,
                     "currentStatus", currentStatus.toString()));
    }

    public static InvalidSubmissionStatusException cannotAddFiles(String submissionId, SubmissionStatus currentStatus) {
        return new InvalidSubmissionStatusException(
            String.format("Cannot add files to submission in status: %s. Submission must be in draft status.", 
                    currentStatus),
            submissionId,
            currentStatus
        );
    }

    public static InvalidSubmissionStatusException cannotSubmit(String submissionId, SubmissionStatus currentStatus) {
        return new InvalidSubmissionStatusException(
            String.format("Cannot submit submission in status: %s. Submission must be in draft status.", 
                    currentStatus),
            submissionId,
            currentStatus
        );
    }

    public static InvalidSubmissionStatusException cannotApprove(String submissionId, SubmissionStatus currentStatus) {
        return new InvalidSubmissionStatusException(
            String.format("Cannot approve submission in status: %s. Submission must be pending_review.", 
                    currentStatus),
            submissionId,
            currentStatus
        );
    }

    public static InvalidSubmissionStatusException cannotReject(String submissionId, SubmissionStatus currentStatus) {
        return new InvalidSubmissionStatusException(
            String.format("Cannot reject submission in status: %s. Submission must be pending_review.", 
                    currentStatus),
            submissionId,
            currentStatus
        );
    }
}

