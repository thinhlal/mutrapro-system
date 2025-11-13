package com.mutrapro.project_service.exception;

import com.mutrapro.shared.exception.BusinessException;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;

public class SignatureException extends BusinessException {

    public SignatureException(String message) {
        super(ProjectServiceErrorCodes.SIGNATURE_UPLOAD_FAILED, message);
    }

    public static SignatureException uploadFailed(String reason) {
        return new SignatureException(
            String.format("Failed to upload signature: %s", reason)
        );
    }
}

