package com.mutrapro.request_service.service;

import com.mutrapro.request_service.dto.response.RequestStatisticsResponse;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.repository.ServiceRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.Map;

/**
 * Service tính toán thống kê cho service requests (dùng cho admin dashboard).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminRequestStatisticsService {

    private final ServiceRequestRepository serviceRequestRepository;

    @Transactional(readOnly = true)
    public RequestStatisticsResponse getStatistics() {
        log.info("Calculating request statistics for admin");

        long total = serviceRequestRepository.count();

        Map<RequestStatus, Long> byStatus = new EnumMap<>(RequestStatus.class);
        for (RequestStatus status : RequestStatus.values()) {
            long count = serviceRequestRepository.countByStatus(status);
            if (count > 0) {
                byStatus.put(status, count);
            }
        }

        Map<ServiceType, Long> byType = new EnumMap<>(ServiceType.class);
        for (ServiceType type : ServiceType.values()) {
            long count = serviceRequestRepository.countByRequestType(type);
            if (count > 0) {
                byType.put(type, count);
            }
        }

        return RequestStatisticsResponse.builder()
                .totalRequests(total)
                .byStatus(byStatus)
                .byType(byType)
                .build();
    }
}


