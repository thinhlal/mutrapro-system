package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

/**
 * Exception khi không tìm thấy revision request
 */
public class RevisionRequestNotFoundException extends ResourceNotFoundException {

    public RevisionRequestNotFoundException(String revisionRequestId) {
        super(
            ProjectServiceErrorCodes.REVISION_REQUEST_NOT_FOUND,
            String.format("Revision request not found: %s", revisionRequestId)
        );
    }

    public RevisionRequestNotFoundException(String revisionRequestId, Throwable cause) {
        super(
            ProjectServiceErrorCodes.REVISION_REQUEST_NOT_FOUND,
            String.format("Revision request not found: %s", revisionRequestId),
            cause
        );
    }

    public static RevisionRequestNotFoundException byId(String revisionRequestId) {
        return new RevisionRequestNotFoundException(revisionRequestId);
    }
}

