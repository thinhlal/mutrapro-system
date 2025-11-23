package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi không thể retrieve signature image
 */
public class SignatureRetrieveException extends BusinessException {

    public SignatureRetrieveException(String message) {
        super(ProjectServiceErrorCodes.SIGNATURE_RETRIEVE_ERROR, message);
    }

    public SignatureRetrieveException(String message, Throwable cause) {
        super(ProjectServiceErrorCodes.SIGNATURE_RETRIEVE_ERROR, message);
        initCause(cause);
    }

    public static SignatureRetrieveException failed(String contractId, String errorMessage, Throwable cause) {
        return new SignatureRetrieveException(
            String.format("Failed to retrieve signature image for contract %s: %s", contractId, errorMessage),
            cause
        );
    }
}

