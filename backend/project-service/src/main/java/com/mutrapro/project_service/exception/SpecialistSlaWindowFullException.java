package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.BusinessException;

import java.util.Map;

/**
 * Exception khi specialist đã "full" trong SLA window của milestone đang assign.
 * Rule: tasksInSlaWindow >= maxConcurrentTasks => không cho assign.
 */
public class SpecialistSlaWindowFullException extends BusinessException {

    private SpecialistSlaWindowFullException(String message, Map<String, Object> details) {
        super(ProjectServiceErrorCodes.VALIDATION_ERROR, message, details);
    }

    public static SpecialistSlaWindowFullException create(
            String specialistId,
            Integer tasksInSlaWindow,
            Integer maxConcurrentTasks,
            String contractId,
            String milestoneId) {
        int safeTasks = tasksInSlaWindow != null ? tasksInSlaWindow : 0;
        int safeMax = maxConcurrentTasks != null ? maxConcurrentTasks : 1;
        return new SpecialistSlaWindowFullException(
            String.format("Specialist is full in SLA window (tasksInSlaWindow=%d, maxConcurrentTasks=%d)", safeTasks, safeMax),
            Map.of(
                "specialistId", specialistId,
                "tasksInSlaWindow", safeTasks,
                "maxConcurrentTasks", safeMax,
                "contractId", contractId,
                "milestoneId", milestoneId
            )
        );
    }
}


