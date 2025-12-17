package com.mutrapro.project_service.dto.projection;

/**
 * Projection interface để chỉ fetch contractId và revisionDeadlineDays
 * Tối ưu performance cho getRevisionRequestsByManager
 */
public interface ContractRevisionDeadlineInfo {
    String getContractId();
    Integer getRevisionDeadlineDays();
}

