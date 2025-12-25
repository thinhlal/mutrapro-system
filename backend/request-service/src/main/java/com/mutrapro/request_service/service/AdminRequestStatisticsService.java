package com.mutrapro.request_service.service;

import com.mutrapro.request_service.dto.response.NotationInstrumentStatisticsResponse;
import com.mutrapro.request_service.dto.response.RequestModuleStatisticsResponse;
import com.mutrapro.request_service.dto.response.RequestStatisticsResponse;
import com.mutrapro.request_service.enums.RequestStatus;
import com.mutrapro.request_service.enums.ServiceType;
import com.mutrapro.request_service.repository.NotationInstrumentRepository;
import com.mutrapro.request_service.repository.RequestNotationInstrumentRepository;
import com.mutrapro.request_service.repository.ServiceRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Service tính toán thống kê cho service requests (dùng cho admin dashboard).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminRequestStatisticsService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final NotationInstrumentRepository notationInstrumentRepository;
    private final RequestNotationInstrumentRepository requestNotationInstrumentRepository;

    @Transactional(readOnly = true)
    public RequestStatisticsResponse getStatistics() {
        log.info("Calculating request statistics for admin");

        long total = serviceRequestRepository.count();

        // Use GROUP BY queries to get all counts in 2 queries instead of multiple individual queries
        Map<RequestStatus, Long> byStatus = new EnumMap<>(RequestStatus.class);
        List<Object[]> statusCounts = serviceRequestRepository.countByStatusGroupBy();
        for (Object[] result : statusCounts) {
            RequestStatus status = (RequestStatus) result[0];
            Long count = ((Number) result[1]).longValue();
            byStatus.put(status, count);
        }

        Map<ServiceType, Long> byType = new EnumMap<>(ServiceType.class);
        List<Object[]> typeCounts = serviceRequestRepository.countByRequestTypeGroupBy();
        for (Object[] result : typeCounts) {
            ServiceType type = (ServiceType) result[0];
            Long count = ((Number) result[1]).longValue();
            byType.put(type, count);
        }

        return RequestStatisticsResponse.builder()
                .totalRequests(total)
                .byStatus(byStatus)
                .byType(byType)
                .build();
    }

    /**
     * Get notation instrument statistics for admin dashboard
     * @return NotationInstrumentStatisticsResponse with total count and most used instrument
     */
    @Transactional(readOnly = true)
    public NotationInstrumentStatisticsResponse getNotationInstrumentStatistics() {
        log.info("Calculating notation instrument statistics for admin");
        
        // Đếm tổng số instruments active - use count query for better performance
        long total = notationInstrumentRepository.countByIsActiveTrue();
        
        // Tìm instrument được sử dụng nhiều nhất
        List<Object[]> usageCounts = requestNotationInstrumentRepository.countUsageByInstrument();
        
        String mostUsed = "N/A";
        if (!usageCounts.isEmpty()) {
            String mostUsedInstrumentId = (String) usageCounts.get(0)[0];
            // Fetch instrument name by ID
            mostUsed = notationInstrumentRepository.findById(mostUsedInstrumentId)
                .map(instrument -> instrument.getInstrumentName())
                .orElse("N/A");
        }
        
        return NotationInstrumentStatisticsResponse.builder()
                .total(total)
                .mostUsed(mostUsed)
                .build();
    }

    /**
     * Get all request module statistics for admin dashboard (requests và notation instruments)
     * Gộp tất cả statistics vào một response để giảm số lượng API calls
     * @return RequestModuleStatisticsResponse với đầy đủ statistics
     */
    @Transactional(readOnly = true)
    public RequestModuleStatisticsResponse getAllRequestModuleStatistics() {
        log.info("Calculating all request module statistics for admin dashboard");
        
        RequestStatisticsResponse requests = getStatistics();
        NotationInstrumentStatisticsResponse notationInstruments = getNotationInstrumentStatistics();
        
        return RequestModuleStatisticsResponse.builder()
                .requests(requests)
                .notationInstruments(notationInstruments)
                .build();
    }
}


