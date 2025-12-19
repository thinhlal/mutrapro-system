package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.TaskType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskStatisticsResponse {
    private long totalTasks;
    private Map<AssignmentStatus, Long> byStatus;
    private Map<TaskType, Long> byType;
}


