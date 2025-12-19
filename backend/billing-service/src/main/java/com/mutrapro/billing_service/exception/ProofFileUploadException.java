package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi upload proof file thất bại
 */
public class ProofFileUploadException extends BusinessException {

    public ProofFileUploadException(String message) {
        super(BillingServiceErrorCodes.PROOF_FILE_UPLOAD_FAILED, message);
    }

    public ProofFileUploadException(String message, String withdrawalRequestId, String fileName, Throwable cause) {
        super(BillingServiceErrorCodes.PROOF_FILE_UPLOAD_FAILED, message, 
              Map.of(
                  "withdrawalRequestId", withdrawalRequestId != null ? withdrawalRequestId : "unknown",
                  "fileName", fileName != null ? fileName : "unknown"
              ),
              cause);
    }
    
    public static ProofFileUploadException create(String withdrawalRequestId, String fileName, Throwable cause) {
        return new ProofFileUploadException(
            String.format("Failed to upload proof file: %s", cause != null ? cause.getMessage() : "Unknown error"),
            withdrawalRequestId, fileName, cause
        );
    }
}

