package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.Instant;
import java.time.LocalDateTime;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class MilestoneAssignmentSlotResponse {

    String contractId;
    String contractNumber;
    String contractType;
    String customerName;

    String milestoneId;
    Integer milestoneOrderIndex;
    String milestoneName;
    String milestoneDescription;
    LocalDateTime plannedStartAt;
    LocalDateTime plannedDueDate;
    LocalDateTime actualStartAt;
    LocalDateTime actualEndAt;
    Integer milestoneSlaDays;

    String assignmentId;
    TaskType taskType;
    String assignmentStatus;
    String specialistId;
    String specialistName;
    Instant assignedDate;

    Boolean hasIssue;

    boolean canAssign;
}


