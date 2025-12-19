package com.mutrapro.project_service.dto.response;

import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractStatisticsResponse {
    private long totalContracts;
    private Map<ContractStatus, Long> byStatus;
    private Map<ContractType, Long> byType;
}


