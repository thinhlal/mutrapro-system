package com.mutrapro.project_service.dto.projection;

import com.mutrapro.project_service.enums.ContractType;

import java.time.LocalDateTime;

/**
 * Projection interface để chỉ fetch các field cần thiết của Contract cho getTaskStats
 * Chỉ cần: contractId, contractType, workStartAt
 */
public interface ContractTaskStatsInfo {
    String getContractId();
    ContractType getContractType();
    LocalDateTime getWorkStartAt();
}

