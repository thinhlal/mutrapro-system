package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

/**
 * Exception khi task assignment không thuộc về contract được chỉ định
 */
public class TaskAssignmentNotBelongToContractException extends BusinessException {

    public TaskAssignmentNotBelongToContractException(String assignmentId, String contractId) {
        super(
            ProjectServiceErrorCodes.TASK_ASSIGNMENT_NOT_BELONG_TO_CONTRACT,
            String.format("Task assignment %s does not belong to contract %s", assignmentId, contractId)
        );
    }

    public static TaskAssignmentNotBelongToContractException create(String assignmentId, String contractId) {
        return new TaskAssignmentNotBelongToContractException(assignmentId, contractId);
    }
}

