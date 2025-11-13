package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi contract status không hợp lệ cho action được yêu cầu
 */
public class InvalidContractStatusException extends BusinessException {

    public InvalidContractStatusException(String message) {
        super(ProjectServiceErrorCodes.INVALID_CONTRACT_STATUS, message);
    }

    public InvalidContractStatusException(String message, String contractId, ContractStatus currentStatus) {
        super(ProjectServiceErrorCodes.INVALID_CONTRACT_STATUS, message,
              Map.of("contractId", contractId,
                     "currentStatus", currentStatus.toString()));
    }

    public static InvalidContractStatusException cannotCancel(String contractId, ContractStatus currentStatus) {
        return new InvalidContractStatusException(
            String.format("Cannot cancel contract. Contract must be in SENT status, but current status is: %s", currentStatus),
            contractId,
            currentStatus
        );
    }

    public static InvalidContractStatusException cannotCancel(String contractId, ContractStatus currentStatus, String customMessage) {
        return new InvalidContractStatusException(
            customMessage != null ? customMessage : 
                String.format("Cannot cancel contract. Contract must be in SENT status, but current status is: %s", currentStatus),
            contractId,
            currentStatus
        );
    }

    public static InvalidContractStatusException cannotApprove(String contractId, ContractStatus currentStatus) {
        return new InvalidContractStatusException(
            String.format("Cannot approve contract. Contract must be in SENT status, but current status is: %s", currentStatus),
            contractId,
            currentStatus
        );
    }

    public static InvalidContractStatusException cannotRequestChange(String contractId, ContractStatus currentStatus) {
        return new InvalidContractStatusException(
            String.format("Cannot request change. Contract must be in SENT status, but current status is: %s", currentStatus),
            contractId,
            currentStatus
        );
    }

    public static InvalidContractStatusException cannotUpdate(String contractId, ContractStatus currentStatus, String customMessage) {
        return new InvalidContractStatusException(
            customMessage != null ? customMessage :
                String.format("Cannot update contract status. Current status is: %s", currentStatus),
            contractId,
            currentStatus
        );
    }

    public static InvalidContractStatusException forUpdate(String contractId, String currentStatus) {
        return new InvalidContractStatusException(
            String.format("Cannot update contract. Only DRAFT contracts can be updated, but current status is: %s", currentStatus)
        );
    }

    public static InvalidContractStatusException forSign(String contractId, String currentStatus) {
        return new InvalidContractStatusException(
            String.format("Cannot sign contract. Contract must be in APPROVED status, but current status is: %s", currentStatus)
        );
    }

    public static InvalidContractStatusException forExpired(String contractId) {
        return new InvalidContractStatusException(
            String.format("Cannot sign contract. Contract %s has expired.", contractId)
        );
    }

    public static InvalidContractStatusException cannotUploadPdf(String contractId, ContractStatus currentStatus) {
        return new InvalidContractStatusException(
            String.format("Cannot upload PDF. Only signed contracts can have PDF uploaded, but current status is: %s", currentStatus),
            contractId,
            currentStatus
        );
    }
}

