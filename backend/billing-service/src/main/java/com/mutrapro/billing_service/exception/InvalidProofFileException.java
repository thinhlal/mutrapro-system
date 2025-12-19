package com.mutrapro.billing_service.exception;

import com.mutrapro.billing_service.enums.BillingServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi proof file không hợp lệ (format hoặc size)
 */
public class InvalidProofFileException extends BusinessException {

    public InvalidProofFileException(String message) {
        super(BillingServiceErrorCodes.INVALID_PROOF_FILE, message);
    }

    public InvalidProofFileException(String message, String fileName, String contentType, Long fileSize, Long maxSize) {
        super(BillingServiceErrorCodes.INVALID_PROOF_FILE, message, 
              Map.of(
                  "fileName", fileName != null ? fileName : "unknown",
                  "contentType", contentType != null ? contentType : "unknown",
                  "fileSize", fileSize != null ? fileSize.toString() : "0",
                  "maxSize", maxSize != null ? maxSize.toString() : "0"
              ));
    }
    
    public static InvalidProofFileException invalidType(String fileName, String contentType) {
        return new InvalidProofFileException(
            String.format("Proof file must be an image (JPEG, PNG) or PDF. Received: %s", contentType),
            fileName, contentType, null, null
        );
    }
    
    public static InvalidProofFileException exceedsSizeLimit(String fileName, Long fileSize, Long maxSize) {
        return new InvalidProofFileException(
            String.format("Proof file size exceeds limit. Size: %d bytes, Max: %d bytes", fileSize, maxSize),
            fileName, null, fileSize, maxSize
        );
    }
}

