package com.mutrapro.project_service.dto.projection;

import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;

import java.time.LocalDateTime;

/**
 * Projection interface để chỉ fetch các field cần thiết của Contract
 * Tối ưu performance cho getMilestoneAssignmentSlots
 */
public interface ContractBasicInfo {
    String getContractId();
    String getContractNumber();
    ContractType getContractType();
    String getNameSnapshot();
    ContractStatus getStatus();
    LocalDateTime getCreatedAt();
}

