package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi download proof file thất bại
 */
public class ProofFileDownloadException extends BusinessException {

    public ProofFileDownloadException(String message) {
        super(BillingServiceErrorCodes.PROOF_FILE_DOWNLOAD_FAILED, message);
    }

    public ProofFileDownloadException(String message, String proofS3Key, Throwable cause) {
        super(BillingServiceErrorCodes.PROOF_FILE_DOWNLOAD_FAILED, message, 
              Map.of(
                  "proofS3Key", proofS3Key != null ? proofS3Key : "unknown"
              ),
              cause);
    }
    
    public static ProofFileDownloadException create(String proofS3Key, Throwable cause) {
        return new ProofFileDownloadException(
            String.format("Failed to download proof file: %s", cause != null ? cause.getMessage() : "Unknown error"),
            proofS3Key, cause
        );
    }
}

