package com.mutrapro.request_service.service;

import com.mutrapro.request_service.dto.response.NotationInstrumentStatisticsResponse;
import com.mutrapro.request_service.dto.response.RequestModuleStatisticsResponse;
import com.mutrapro.request_service.dto.response.RequestStatisticsByDateResponse;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

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

        // Count unassigned requests (managerUserId IS NULL)
        long unassignedRequests = serviceRequestRepository.countByManagerUserIdIsNull();

        return RequestStatisticsResponse.builder()
                .totalRequests(total)
                .byStatus(byStatus)
                .byType(byType)
                .unassignedRequests(unassignedRequests)
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

    /**
     * Get request statistics over time (by date and status) for Pipeline Flow chart
     * @param days Number of days to look back (default: 7)
     * @return RequestStatisticsByDateResponse with daily stats grouped by status
     */
    @Transactional(readOnly = true)
    public RequestStatisticsByDateResponse getStatisticsOverTime(int days) {
        log.info("Calculating request statistics over time for last {} days", days);
        
        LocalDateTime startDate = LocalDateTime.now().minusDays(days).withHour(0).withMinute(0).withSecond(0).withNano(0);
        
        // Query: GROUP BY DATE(created_at), status
        List<Object[]> results = serviceRequestRepository.countByStatusAndDateGroupBy(startDate);
        
        // Map results: [date, status, count] -> Map<LocalDate, Map<RequestStatus, Long>>
        Map<LocalDate, Map<RequestStatus, Long>> statsByDate = new LinkedHashMap<>();
        
        for (Object[] result : results) {
            // result[0] = date (LocalDate or Date)
            // result[1] = status (String from enum)
            // result[2] = count (Long or Number)
            
            LocalDate date;
            if (result[0] instanceof LocalDate) {
                date = (LocalDate) result[0];
            } else if (result[0] instanceof java.sql.Date) {
                date = ((java.sql.Date) result[0]).toLocalDate();
            } else if (result[0] instanceof java.util.Date) {
                date = ((java.util.Date) result[0]).toInstant()
                    .atZone(java.time.ZoneId.systemDefault())
                    .toLocalDate();
            } else {
                log.warn("Unexpected date type: {}", result[0].getClass());
                continue;
            }
            
            RequestStatus status;
            if (result[1] instanceof RequestStatus) {
                status = (RequestStatus) result[1];
            } else if (result[1] instanceof String) {
                try {
                    status = RequestStatus.valueOf(((String) result[1]).toLowerCase());
                } catch (IllegalArgumentException e) {
                    log.warn("Unknown request status: {}", result[1]);
                    continue;
                }
            } else {
                log.warn("Unexpected status type: {}", result[1].getClass());
                continue;
            }
            
            Long count = ((Number) result[2]).longValue();
            
            statsByDate.computeIfAbsent(date, k -> new EnumMap<>(RequestStatus.class))
                    .put(status, count);
        }
        
        // Generate list for all dates in range (fill missing dates with 0)
        List<RequestStatisticsByDateResponse.DailyRequestStats> dailyStats = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            Map<RequestStatus, Long> statusCounts = statsByDate.getOrDefault(date, new EnumMap<>(RequestStatus.class));
            
            RequestStatisticsByDateResponse.DailyRequestStats dailyStat = RequestStatisticsByDateResponse.DailyRequestStats.builder()
                    .date(date)
                    .pending(statusCounts.getOrDefault(RequestStatus.pending, 0L))
                    .inProgress(statusCounts.getOrDefault(RequestStatus.in_progress, 0L))
                    .completed(statusCounts.getOrDefault(RequestStatus.completed, 0L))
                    .build();
            
            dailyStats.add(dailyStat);
        }
        
        return RequestStatisticsByDateResponse.builder()
                .dailyStats(dailyStats)
                .build();
    }
}


