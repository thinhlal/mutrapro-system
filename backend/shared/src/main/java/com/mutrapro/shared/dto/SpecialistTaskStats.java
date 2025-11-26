package com.mutrapro.shared.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpecialistTaskStats {
    private Integer totalOpenTasks;
    private Integer tasksInSlaWindow;
}

