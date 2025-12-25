package com.mutrapro.project_service.service;

import com.mutrapro.project_service.dto.response.AllProjectStatisticsResponse;
import com.mutrapro.project_service.dto.response.CompletionRateResponse;
import com.mutrapro.project_service.dto.response.ContractStatisticsResponse;
import com.mutrapro.project_service.dto.response.ModuleStatisticsResponse;
import com.mutrapro.project_service.dto.response.ProjectStatisticsResponse;
import com.mutrapro.project_service.dto.response.TaskStatisticsResponse;
import com.mutrapro.project_service.dto.response.WorkloadDistributionResponse;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.repository.BookingRequiredEquipmentRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
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

import com.mutrapro.project_service.entity.StudioBooking;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminStatisticsService {

    private final ContractRepository contractRepository;
    private final ContractMilestoneRepository contractMilestoneRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final TaskAssignmentService taskAssignmentService;
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

    /**
     * Get workload distribution (open tasks count by specialist) for Manager Dashboard
     * @return WorkloadDistributionResponse with list of specialists and their open task counts
     */
    @Transactional(readOnly = true)
    public WorkloadDistributionResponse getWorkloadDistribution() {
        log.info("Calculating workload distribution for manager dashboard");
        
        // Define open statuses (same as isOpenStatus in TaskAssignmentService)
        List<AssignmentStatus> openStatuses = List.of(
            AssignmentStatus.assigned,
            AssignmentStatus.accepted_waiting,
            AssignmentStatus.ready_to_start,
            AssignmentStatus.in_progress,
            AssignmentStatus.ready_for_review,
            AssignmentStatus.revision_requested,
            AssignmentStatus.in_revision,
            AssignmentStatus.delivery_pending
        );
        
        // Query to count open tasks by specialist
        List<Object[]> results = taskAssignmentRepository.countOpenTasksBySpecialistGroupBy(openStatuses);
        
        // Map results: [specialistId, specialistName, count] -> List<SpecialistWorkload>
        List<WorkloadDistributionResponse.SpecialistWorkload> specialists = new ArrayList<>();
        for (Object[] result : results) {
            String specialistId = (String) result[0];
            String specialistName = result[1] != null ? (String) result[1] : "Unknown";
            Long taskCount = ((Number) result[2]).longValue();
            
            specialists.add(WorkloadDistributionResponse.SpecialistWorkload.builder()
                    .specialistId(specialistId)
                    .specialistName(specialistName)
                    .taskCount(taskCount)
                    .build());
        }
        
        return WorkloadDistributionResponse.builder()
                .specialists(specialists)
                .build();
    }

    /**
     * Get on-time completion rate over time for Manager Dashboard
     * @param days Number of days to look back (default: 7)
     * @return CompletionRateResponse with daily completion rates
     */
    @Transactional(readOnly = true)
    public CompletionRateResponse getCompletionRateOverTime(int days) {
        log.info("Calculating completion rate over time for last {} days", days);
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days - 1);
        
        // Query completed tasks in date range
        List<TaskAssignment> completedTasks = taskAssignmentRepository.findCompletedTasksByDateRange(startDate, endDate);
        
        if (completedTasks.isEmpty()) {
            // Return empty rates for all dates
            List<CompletionRateResponse.DailyCompletionRate> dailyRates = new ArrayList<>();
            for (int i = days - 1; i >= 0; i--) {
                LocalDate date = endDate.minusDays(i);
                dailyRates.add(CompletionRateResponse.DailyCompletionRate.builder()
                        .date(date)
                        .rate(null)
                        .totalCompleted(0L)
                        .onTimeCompleted(0L)
                        .build());
            }
            return CompletionRateResponse.builder()
                    .dailyRates(dailyRates)
                    .build();
        }
        
        // Batch load milestones and contracts to avoid N+1 queries
        Set<String> uniqueContractIds = completedTasks.stream()
                .map(TaskAssignment::getContractId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        
        // Batch load contracts
        Map<String, Contract> contractsMap = new HashMap<>();
        if (!uniqueContractIds.isEmpty()) {
            List<Contract> contracts = contractRepository.findAllById(uniqueContractIds);
            contracts.forEach(c -> contractsMap.put(c.getContractId(), c));
        }
        
        // Batch load all milestones for all contracts (needed for deadline calculation)
        Map<String, List<ContractMilestone>> allMilestonesByContractId = new HashMap<>();
        Map<String, ContractMilestone> milestonesMap = new HashMap<>();
        if (!uniqueContractIds.isEmpty()) {
            List<ContractMilestone> allMilestones = contractMilestoneRepository
                    .findByContractIdIn(new ArrayList<>(uniqueContractIds));
            
            // Group by contractId
            allMilestonesByContractId = allMilestones.stream()
                    .collect(Collectors.groupingBy(
                            ContractMilestone::getContractId,
                            Collectors.collectingAndThen(
                                    Collectors.toList(),
                                    list -> list.stream()
                                            .sorted(Comparator.comparing(ContractMilestone::getOrderIndex,
                                                    Comparator.nullsLast(Comparator.naturalOrder())))
                                            .collect(Collectors.toList())
                            )
                    ));
            
            // Build milestonesMap
            allMilestones.forEach(m -> {
                String key = m.getMilestoneId() + ":" + m.getContractId();
                milestonesMap.put(key, m);
            });
        }
        
        // Batch load bookings for recording milestones (needed for deadline calculation)
        Set<String> recordingMilestoneIds = milestonesMap.values().stream()
                .filter(m -> m.getMilestoneType() == MilestoneType.recording)
                .map(ContractMilestone::getMilestoneId)
                .collect(Collectors.toSet());
        Map<String, StudioBooking> bookingsByMilestoneId = new HashMap<>();
        if (!recordingMilestoneIds.isEmpty()) {
            List<StudioBooking> bookings = studioBookingRepository.findByMilestoneIdIn(new ArrayList<>(recordingMilestoneIds));
            bookings.forEach(b -> bookingsByMilestoneId.put(b.getMilestoneId(), b));
        }
        
        // Group tasks by completion date and calculate on-time rate
        Map<LocalDate, List<TaskAssignment>> tasksByDate = completedTasks.stream()
                .filter(task -> task.getCompletedDate() != null)
                .collect(Collectors.groupingBy(task -> task.getCompletedDate().toLocalDate()));
        
        // Generate list for all dates in range (fill missing dates)
        List<CompletionRateResponse.DailyCompletionRate> dailyRates = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            LocalDate date = endDate.minusDays(i);
            List<TaskAssignment> tasksOnDate = tasksByDate.getOrDefault(date, new ArrayList<>());
            
            long totalCompleted = tasksOnDate.size();
            long onTimeCompleted = 0;
            long tasksWithDeadline = 0;
            
            if (totalCompleted > 0) {
                // Calculate on-time completed tasks using correct deadline logic from TaskAssignmentService
                for (TaskAssignment task : tasksOnDate) {
                    LocalDateTime deadline = taskAssignmentService.resolveTaskDeadlineWithCache(
                            task, milestonesMap, contractsMap, allMilestonesByContractId, bookingsByMilestoneId);
                    if (deadline != null && task.getCompletedDate() != null) {
                        tasksWithDeadline++;
                        if (!task.getCompletedDate().isAfter(deadline)) {
                            onTimeCompleted++;
                        }
                    }
                }
            }
            
            // Only calculate rate for tasks that have a deadline
            // If no tasks have deadline, rate is null (unknown)
            Double rate = tasksWithDeadline > 0 ? (double) onTimeCompleted * 100.0 / tasksWithDeadline : null;
            
            dailyRates.add(CompletionRateResponse.DailyCompletionRate.builder()
                    .date(date)
                    .rate(rate)
                    .totalCompleted(totalCompleted)
                    .onTimeCompleted(onTimeCompleted)
                    .build());
        }
        
        return CompletionRateResponse.builder()
                .dailyRates(dailyRates)
                .build();
    }
    
}


