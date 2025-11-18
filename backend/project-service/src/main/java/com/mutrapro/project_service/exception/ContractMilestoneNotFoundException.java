package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy contract milestone
 */
public class ContractMilestoneNotFoundException extends ResourceNotFoundException {

    public ContractMilestoneNotFoundException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_MILESTONE_NOT_FOUND, message);
    }

    public ContractMilestoneNotFoundException(String message, String milestoneId, String contractId) {
        super(ProjectServiceErrorCodes.CONTRACT_MILESTONE_NOT_FOUND, message, 
              Map.of(
                  "milestoneId", milestoneId != null ? milestoneId : "unknown",
                  "contractId", contractId != null ? contractId : "unknown"
              ));
    }

    public static ContractMilestoneNotFoundException create(String milestoneId, String contractId) {
        return new ContractMilestoneNotFoundException(
            "Contract milestone not found: milestoneId=" + milestoneId + ", contractId=" + contractId,
            milestoneId,
            contractId
        );
    }
    
    public static ContractMilestoneNotFoundException byId(String milestoneId, String contractId) {
        return new ContractMilestoneNotFoundException(
            "Contract milestone not found with milestoneId: " + milestoneId + " and contractId: " + contractId,
            milestoneId,
            contractId
        );
    }
}

