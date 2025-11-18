package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class TaskAssignmentResponse {

    String assignmentId;

    String contractId;

    String specialistId;

    TaskType taskType;

    AssignmentStatus status;

    String milestoneId;

    Instant assignedDate;

    Instant completedDate;

    String notes;

    Boolean specialistCanDo;

    String specialistResponseReason;

    Instant specialistRespondedAt;

    Integer usedRevisions;

    // Reassign request fields
    String reassignReason;
    Instant reassignRequestedAt;
    String reassignRequestedBy;
    String reassignApprovedBy;
    Instant reassignApprovedAt;
    String reassignDecision;
    String reassignDecisionReason;
}

