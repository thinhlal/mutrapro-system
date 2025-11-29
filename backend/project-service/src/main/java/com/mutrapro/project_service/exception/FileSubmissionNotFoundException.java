package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

/**
 * Exception khi không tìm thấy file submission
 */
public class FileSubmissionNotFoundException extends ResourceNotFoundException {

    public FileSubmissionNotFoundException(String submissionId) {
        super(
            ProjectServiceErrorCodes.FILE_SUBMISSION_NOT_FOUND,
            String.format("File submission not found: %s", submissionId)
        );
    }

    public FileSubmissionNotFoundException(String submissionId, Throwable cause) {
        super(
            ProjectServiceErrorCodes.FILE_SUBMISSION_NOT_FOUND,
            String.format("File submission not found: %s", submissionId),
            cause
        );
    }

    public static FileSubmissionNotFoundException byId(String submissionId) {
        return new FileSubmissionNotFoundException(submissionId);
    }
}

