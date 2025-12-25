package com.mutrapro.request_service.dto.response;

import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Aggregate statistics for service requests (for admin dashboard).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestStatisticsResponse {

    private long totalRequests;

    /**
     * Count of requests grouped by status.
     */
    private Map<RequestStatus, Long> byStatus;

    /**
     * Count of requests grouped by service type.
     */
    private Map<ServiceType, Long> byType;
    
    /**
     * Count of unassigned requests (requests chưa assign manager - managerUserId IS NULL)
     */
    private long unassignedRequests;
}


