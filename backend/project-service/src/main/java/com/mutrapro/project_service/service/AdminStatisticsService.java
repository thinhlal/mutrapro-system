package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.AllProjectStatisticsResponse;
import com.mutrapro.project_service.dto.response.ContractStatisticsResponse;
import com.mutrapro.project_service.dto.response.ModuleStatisticsResponse;
import com.mutrapro.project_service.dto.response.ProjectStatisticsResponse;
import com.mutrapro.project_service.dto.response.TaskStatisticsResponse;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.repository.BookingRequiredEquipmentRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.EquipmentRepository;
import com.mutrapro.project_service.repository.RevisionRequestRepository;
import com.mutrapro.project_service.repository.StudioBookingRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.RevisionRequestStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminStatisticsService {

    private final ContractRepository contractRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final EquipmentRepository equipmentRepository;
    private final BookingRequiredEquipmentRepository bookingRequiredEquipmentRepository;
    private final StudioBookingRepository studioBookingRepository;
    private final RevisionRequestRepository revisionRequestRepository;

    @Transactional(readOnly = true)
    public ContractStatisticsResponse getContractStatistics() {
        log.info("Calculating contract statistics for admin");
        long total = contractRepository.count();

        // Use GROUP BY queries to get all counts in 2 queries instead of 17 (12 status + 5 type)
        Map<ContractStatus, Long> byStatus = new EnumMap<>(ContractStatus.class);
        List<Object[]> statusCounts = contractRepository.countByStatusGroupBy();
        for (Object[] result : statusCounts) {
            ContractStatus status = (ContractStatus) result[0];
            Long count = ((Number) result[1]).longValue();
            byStatus.put(status, count);
        }

        Map<ContractType, Long> byType = new EnumMap<>(ContractType.class);
        List<Object[]> typeCounts = contractRepository.countByContractTypeGroupBy();
        for (Object[] result : typeCounts) {
            ContractType type = (ContractType) result[0];
            Long count = ((Number) result[1]).longValue();
            byType.put(type, count);
        }

        return ContractStatisticsResponse.builder()
                .totalContracts(total)
                .byStatus(byStatus)
                .byType(byType)
                .build();
    }

    @Transactional(readOnly = true)
    public TaskStatisticsResponse getTaskStatistics() {
        log.info("Calculating task statistics for admin");
        long total = taskAssignmentRepository.count();

        // Use GROUP BY queries to get all counts in 2 queries instead of 16 (13 status + 3 type)
        Map<AssignmentStatus, Long> byStatus = new EnumMap<>(AssignmentStatus.class);
        List<Object[]> statusCounts = taskAssignmentRepository.countByStatusGroupBy();
        for (Object[] result : statusCounts) {
            AssignmentStatus status = (AssignmentStatus) result[0];
            Long count = ((Number) result[1]).longValue();
            byStatus.put(status, count);
        }

        Map<TaskType, Long> byType = new EnumMap<>(TaskType.class);
        List<Object[]> typeCounts = taskAssignmentRepository.countByTaskTypeGroupBy();
        for (Object[] result : typeCounts) {
            TaskType type = (TaskType) result[0];
            Long count = ((Number) result[1]).longValue();
            byType.put(type, count);
        }

        return TaskStatisticsResponse.builder()
                .totalTasks(total)
                .byStatus(byStatus)
                .byType(byType)
                .build();
    }

    /**
     * Get equipment statistics for admin dashboard
     * @return ModuleStatisticsResponse.EquipmentStatistics with available, booked, and maintenance counts
     */
    @Transactional(readOnly = true)
    public ModuleStatisticsResponse.EquipmentStatistics getEquipmentStatistics() {
        log.info("Calculating equipment statistics for admin");
        
        // Available: equipment có totalQuantity > 0 và isActive = true
        long available = equipmentRepository.countByIsActiveTrueAndTotalQuantityGreaterThan(0);
        
        // Booked: số equipment đang được booking (active bookings)
        long booked = bookingRequiredEquipmentRepository.countDistinctBookedEquipment();
        
        // Maintenance: equipment không available (totalQuantity = 0 hoặc isActive = false)
        long maintenance = equipmentRepository.countMaintenanceEquipment();
        
        return ModuleStatisticsResponse.EquipmentStatistics.builder()
                .available(available)
                .booked(booked)
                .maintenance(maintenance)
                .build();
    }

    /**
     * Get studio booking statistics for admin dashboard
     * @return ModuleStatisticsResponse.StudioBookingStatistics with total, upcoming, and completed counts
     */
    @Transactional(readOnly = true)
    public ModuleStatisticsResponse.StudioBookingStatistics getStudioBookingStatistics() {
        log.info("Calculating studio booking statistics for admin");
        
        // Total: tổng số bookings
        long total = studioBookingRepository.count();
        
        // Upcoming: bookings có bookingDate >= today và status active
        long upcoming = studioBookingRepository.countUpcomingBookings();
        
        // Completed: bookings có status = COMPLETED
        long completed = studioBookingRepository.countByStatus(BookingStatus.COMPLETED);
        
        return ModuleStatisticsResponse.StudioBookingStatistics.builder()
                .total(total)
                .upcoming(upcoming)
                .completed(completed)
                .build();
    }

    /**
     * Get revision request statistics for admin dashboard
     * @return ModuleStatisticsResponse.RevisionStatistics with pending, approved, and rejected counts
     */
    @Transactional(readOnly = true)
    public ModuleStatisticsResponse.RevisionStatistics getRevisionStatistics() {
        log.info("Calculating revision request statistics for admin");
        
        // Count by status - use IN clause to reduce queries from 7 to 3
        // Pending: PENDING_MANAGER_REVIEW, IN_REVISION, WAITING_MANAGER_REVIEW, WAITING_CUSTOMER_CONFIRM, APPROVED_PENDING_DELIVERY
        List<RevisionRequestStatus> pendingStatuses = List.of(
            RevisionRequestStatus.PENDING_MANAGER_REVIEW,
            RevisionRequestStatus.IN_REVISION,
            RevisionRequestStatus.WAITING_MANAGER_REVIEW,
            RevisionRequestStatus.WAITING_CUSTOMER_CONFIRM,
            RevisionRequestStatus.APPROVED_PENDING_DELIVERY
        );
        long pending = revisionRequestRepository.countByStatusIn(pendingStatuses);
        
        // Approved: COMPLETED
        long approved = revisionRequestRepository.countByStatus(RevisionRequestStatus.COMPLETED);
        
        // Rejected: REJECTED
        long rejected = revisionRequestRepository.countByStatus(RevisionRequestStatus.REJECTED);
        
        return ModuleStatisticsResponse.RevisionStatistics.builder()
                .pending(pending)
                .approved(approved)
                .rejected(rejected)
                .build();
    }

    /**
     * Get all module statistics for admin dashboard (equipment, studio bookings, revision requests)
     * Gộp tất cả module statistics vào một response để giảm số lượng API calls
     * @return ModuleStatisticsResponse với đầy đủ statistics
     */
    @Transactional(readOnly = true)
    public ModuleStatisticsResponse getAllModuleStatistics() {
        log.info("Calculating all module statistics for admin dashboard");
        
        ModuleStatisticsResponse.EquipmentStatistics equipment = getEquipmentStatistics();
        ModuleStatisticsResponse.StudioBookingStatistics studioBookings = getStudioBookingStatistics();
        ModuleStatisticsResponse.RevisionStatistics revisions = getRevisionStatistics();
        
        return ModuleStatisticsResponse.builder()
                .equipment(equipment)
                .studioBookings(studioBookings)
                .revisions(revisions)
                .build();
    }

    /**
     * Get all project statistics for admin dashboard (contracts và tasks)
     * Gộp tất cả project statistics vào một response để giảm số lượng API calls
     * @return ProjectStatisticsResponse với đầy đủ statistics
     */
    @Transactional(readOnly = true)
    public ProjectStatisticsResponse getAllProjectStatistics() {
        log.info("Calculating all project statistics for admin dashboard");
        
        ContractStatisticsResponse contracts = getContractStatistics();
        TaskStatisticsResponse tasks = getTaskStatistics();
        
        return ProjectStatisticsResponse.builder()
                .contracts(contracts)
                .tasks(tasks)
                .build();
    }

    /**
     * Get all project statistics for admin dashboard (statistics và module statistics)
     * Gộp tất cả project statistics vào một response để giảm số lượng API calls
     * @return AllProjectStatisticsResponse với đầy đủ statistics
     */
    @Transactional(readOnly = true)
    public AllProjectStatisticsResponse getAllProjectStatisticsCombined() {
        log.info("Calculating all project statistics for admin dashboard");
        
        ProjectStatisticsResponse statistics = getAllProjectStatistics();
        ModuleStatisticsResponse moduleStatistics = getAllModuleStatistics();
        
        return AllProjectStatisticsResponse.builder()
                .statistics(statistics)
                .moduleStatistics(moduleStatistics)
                .build();
    }
}


