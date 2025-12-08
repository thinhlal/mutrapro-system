package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.TaskType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import static lombok.AccessLevel.PRIVATE;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = PRIVATE)
public class CreateTaskAssignmentRequest {

    @NotBlank(message = "Specialist ID is required")
    String specialistId;

    @NotNull(message = "Task type is required")
    TaskType taskType;  // Frontend sẽ set từ milestone.milestoneType

    @NotBlank(message = "Milestone ID is required")
    String milestoneId;

    String notes;  // Optional
}

