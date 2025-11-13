package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy signature image của contract
 */
public class SignatureImageNotFoundException extends ResourceNotFoundException {

    public SignatureImageNotFoundException(String message) {
        super(ProjectServiceErrorCodes.SIGNATURE_IMAGE_NOT_FOUND, message);
    }

    public SignatureImageNotFoundException(String message, String contractId) {
        super(ProjectServiceErrorCodes.SIGNATURE_IMAGE_NOT_FOUND, message, 
              Map.of("contractId", contractId != null ? contractId : "unknown"));
    }

    public static SignatureImageNotFoundException forContract(String contractId) {
        return new SignatureImageNotFoundException(
            "Signature image not found for contract: " + contractId,
            contractId
        );
    }
}

