package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi file không thuộc về submission được chỉ định
 */
public class FileNotBelongToSubmissionException extends BusinessException {

    public FileNotBelongToSubmissionException(String fileId, String submissionId) {
        super(
            ProjectServiceErrorCodes.FILE_NOT_BELONG_TO_SUBMISSION,
            String.format("File %s does not belong to submission %s", fileId, submissionId)
        );
    }

    public static FileNotBelongToSubmissionException create(String fileId, String submissionId) {
        return new FileNotBelongToSubmissionException(fileId, submissionId);
    }
}

