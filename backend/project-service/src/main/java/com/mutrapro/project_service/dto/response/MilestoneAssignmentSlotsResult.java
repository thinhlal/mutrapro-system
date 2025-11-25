package com.mutrapro.project_service.dto.response;

import com.mutrapro.shared.dto.PageResponse;
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
public class MilestoneAssignmentSlotsResult {

    PageResponse<MilestoneAssignmentSlotResponse> page;
    long totalUnassigned;
    long totalInProgress;
    long totalCompleted;
}


