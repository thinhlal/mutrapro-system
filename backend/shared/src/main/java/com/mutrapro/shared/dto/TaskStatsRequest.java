package com.mutrapro.shared.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskStatsRequest {

    @NotEmpty(message = "specialistIds is required")
    private List<String> specialistIds;

    private String contractId;

    private String milestoneId;
}

