package com.mutrapro.project_service.dto.request;

import com.mutrapro.project_service.enums.TaskType;
import jakarta.validation.constraints.NotBlank;
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
public class UpdateTaskAssignmentRequest {

    @NotBlank(message = "Specialist ID is required")
    String specialistId;

    TaskType taskType;  // Optional, usually shouldn't change

    String milestoneId;  // Optional

    String notes;  // Optional
}

