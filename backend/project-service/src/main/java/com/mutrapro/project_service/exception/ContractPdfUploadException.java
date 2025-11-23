package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi không thể upload contract PDF
 */
public class ContractPdfUploadException extends BusinessException {

    public ContractPdfUploadException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_PDF_UPLOAD_ERROR, message);
    }

    public ContractPdfUploadException(String message, Throwable cause) {
        super(ProjectServiceErrorCodes.CONTRACT_PDF_UPLOAD_ERROR, message);
        initCause(cause);
    }

    public static ContractPdfUploadException failed(String contractId, String errorMessage, Throwable cause) {
        return new ContractPdfUploadException(
            String.format("Failed to upload contract PDF for contract %s: %s", contractId, errorMessage),
            cause
        );
    }
}

