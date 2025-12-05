package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartContractWorkRequest {

    /**
     * Optional custom start time. Nếu null → BE dùng thời điểm hiện tại.
     */
    LocalDateTime startAt;
}

