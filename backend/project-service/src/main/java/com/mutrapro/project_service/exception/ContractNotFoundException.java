package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy contract
 */
public class ContractNotFoundException extends ResourceNotFoundException {

    public ContractNotFoundException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_NOT_FOUND, message);
    }

    public ContractNotFoundException(String message, String contractId) {
        super(ProjectServiceErrorCodes.CONTRACT_NOT_FOUND, message, 
              Map.of("contractId", contractId != null ? contractId : "unknown"));
    }

    public static ContractNotFoundException create(String contractId) {
        return new ContractNotFoundException(
            "Contract not found: " + contractId,
            contractId
        );
    }
    
    public static ContractNotFoundException byId(String contractId) {
        return new ContractNotFoundException(
            "Contract not found with id: " + contractId,
            contractId
        );
    }
    
    public static ContractNotFoundException byContractNumber(String contractNumber) {
        return new ContractNotFoundException(
            "Contract not found with contract number: " + contractNumber,
            contractNumber
        );
    }
}

