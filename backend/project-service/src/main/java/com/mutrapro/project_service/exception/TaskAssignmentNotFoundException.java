package com.mutrapro.project_service.exception;

import com.mutrapro.project_service.enums.ProjectServiceErrorCodes;
import com.mutrapro.shared.exception.ResourceNotFoundException;

import java.util.Map;

/**
 * Exception khi không tìm thấy task assignment
 */
public class TaskAssignmentNotFoundException extends ResourceNotFoundException {

    public TaskAssignmentNotFoundException(String message) {
        super(ProjectServiceErrorCodes.CONTRACT_NOT_FOUND, message);
    }

    public TaskAssignmentNotFoundException(String message, String assignmentId) {
        super(ProjectServiceErrorCodes.CONTRACT_NOT_FOUND, message, 
              Map.of("assignmentId", assignmentId != null ? assignmentId : "unknown"));
    }

    public static TaskAssignmentNotFoundException create(String assignmentId) {
        return new TaskAssignmentNotFoundException(
            "Task assignment not found: " + assignmentId,
            assignmentId
        );
    }
    
    public static TaskAssignmentNotFoundException byId(String assignmentId) {
        return new TaskAssignmentNotFoundException(
            "Task assignment not found with id: " + assignmentId,
            assignmentId
        );
    }
}

