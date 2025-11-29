package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi submission không có files
 */
public class SubmissionEmptyException extends BusinessException {

    public SubmissionEmptyException(String submissionId) {
        super(
            ProjectServiceErrorCodes.SUBMISSION_EMPTY,
            String.format("Cannot submit submission %s without files", submissionId)
        );
    }

    public static SubmissionEmptyException forSubmission(String submissionId) {
        return new SubmissionEmptyException(submissionId);
    }
}

