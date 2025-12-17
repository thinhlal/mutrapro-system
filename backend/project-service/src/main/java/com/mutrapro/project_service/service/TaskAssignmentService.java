package com.mutrapro.project_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.SpecialistServiceFeignClient;
import com.mutrapro.shared.event.TaskAssignmentCanceledEvent;
import com.mutrapro.shared.event.TaskIssueReportedEvent;
import com.mutrapro.project_service.dto.projection.ContractBasicInfo;
import com.mutrapro.project_service.dto.request.CreateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.UpdateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.project_service.entity.FileSubmission;
import com.mutrapro.shared.dto.PageResponse;
import com.mutrapro.project_service.dto.response.MilestoneAssignmentSlotsResult;
import com.mutrapro.project_service.dto.response.MilestoneAssignmentSlotResponse;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.entity.StudioBooking;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.enums.SubmissionStatus;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.SpecialistTaskStats;
import com.mutrapro.shared.dto.TaskStatsRequest;
import com.mutrapro.shared.dto.TaskStatsResponse;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.BookingStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.MilestoneType;
import com.mutrapro.project_service.enums.StudioBookingContext;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.shared.event.TaskAssignmentAssignedEvent;
import com.mutrapro.shared.event.TaskAssignmentReadyToStartEvent;
import com.mutrapro.project_service.mapper.TaskAssignmentMapper;
import com.mutrapro.project_service.exception.ContractMilestoneNotFoundException;
import com.mutrapro.project_service.exception.ContractNotFoundException;
import com.mutrapro.project_service.exception.InvalidContractStatusException;
import com.mutrapro.project_service.exception.InvalidMilestoneIdException;
import com.mutrapro.project_service.exception.InvalidMilestoneWorkStatusException;
import com.mutrapro.project_service.exception.InvalidTaskTypeException;
import com.mutrapro.project_service.exception.TaskAssignmentAlreadyActiveException;
import com.mutrapro.project_service.exception.TaskAssignmentAlreadyCompletedException;
import com.mutrapro.project_service.exception.TaskAssignmentNotFoundException;
import com.mutrapro.project_service.exception.UnauthorizedException;
import com.mutrapro.project_service.exception.UserNotAuthenticatedException;
import com.mutrapro.project_service.exception.InvalidStateException;
import com.mutrapro.project_service.exception.InvalidTaskAssignmentStatusException;
import com.mutrapro.project_service.exception.TaskAssignmentNotBelongToContractException;
import com.mutrapro.project_service.exception.TaskAssignmentNoIssueException;
import com.mutrapro.project_service.exception.SpecialistNotFoundException;
import com.mutrapro.project_service.exception.FailedToFetchSpecialistException;
import com.mutrapro.project_service.exception.SpecialistSlaWindowFullException;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.FileSubmissionRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.StudioBookingRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static lombok.AccessLevel.PRIVATE;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = PRIVATE, makeFinal = true)
public class TaskAssignmentService {

    TaskAssignmentRepository taskAssignmentRepository;
    ContractRepository contractRepository;
    ContractMilestoneRepository contractMilestoneRepository;
    TaskAssignmentMapper taskAssignmentMapper;
    SpecialistServiceFeignClient specialistServiceFeignClient;
    RequestServiceFeignClient requestServiceFeignClient;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;
    MilestoneProgressService milestoneProgressService;
    FileSubmissionRepository fileSubmissionRepository;
    StudioBookingRepository studioBookingRepository;
    ContractMilestoneService contractMilestoneService;

    /**
     * Helper method để publish event vào outbox
     */
    private void publishToOutbox(Object event, String aggregateIdString, String aggregateType, String eventType) {
        try {
            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(aggregateIdString);
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }
            
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType(aggregateType)
                    .eventType(eventType)
                    .eventPayload(payload)
                    .build();
            
            outboxEventRepository.save(outboxEvent);
            log.debug("Queued event in outbox: eventType={}, aggregateId={}", eventType, aggregateId);
        } catch (Exception e) {
            log.error("Failed to enqueue event to outbox: eventType={}, aggregateId={}, error={}", 
                    eventType, aggregateIdString, e.getMessage(), e);
            // Không throw exception để không fail transaction
        }
    }

    /**
     * Lấy danh sách task assignments theo contract ID
     */
    public List<TaskAssignmentResponse> getTaskAssignmentsByContract(String contractId) {
        log.info("Getting task assignments for contract: contractId={}", contractId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission (manager of the contract)
        verifyManagerPermission(contract);
        
        List<TaskAssignment> assignments = taskAssignmentRepository.findByContractId(contractId);
        
        return assignments.stream()
            .map(this::enrichTaskAssignment)
            .toList();
    }

    /**
     * Lấy danh sách task assignments theo milestone ID
     */
    public List<TaskAssignmentResponse> getTaskAssignmentsByMilestone(
            String contractId, String milestoneId) {
        log.info("Getting task assignments for milestone: contractId={}, milestoneId={}", 
            contractId, milestoneId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Verify milestone exists and belongs to contract
        contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(milestoneId, contractId));
        
        List<TaskAssignment> assignments = taskAssignmentRepository
            .findByContractIdAndMilestoneId(contractId, milestoneId);
        return assignments.stream()
            .map(this::enrichTaskAssignment)
            .toList();
    }

    /**
     * Lấy danh sách task assignments theo specialistId (cho internal use bởi specialist-service)
     * Không cần verify permission vì đây là internal API
     */
    public List<TaskAssignmentResponse> getTaskAssignmentsBySpecialistId(String specialistId) {
        log.info("Getting task assignments for specialist: specialistId={}", specialistId);
        
        List<TaskAssignment> assignments = taskAssignmentRepository.findBySpecialistId(specialistId);
        return assignments.stream()
            .map(this::enrichTaskAssignment)
            .toList();
    }

    /**
     * Lấy danh sách task assignments cho nhiều specialists cùng lúc (batch query)
     * Trả về Map<specialistId, List<TaskAssignmentResponse>> để dễ lookup
     * Không cần verify permission vì đây là internal API
     * 
     * Tối ưu: Batch fetch milestones và specialist info để tránh N+1 queries
     */
    public Map<String, List<TaskAssignmentResponse>> getTaskAssignmentsBySpecialistIds(List<String> specialistIds) {
        if (specialistIds == null || specialistIds.isEmpty()) {
            return new HashMap<>();
        }
        log.info("Getting task assignments for {} specialists (batch)", specialistIds.size());
        
        List<TaskAssignment> assignments = taskAssignmentRepository.findBySpecialistIdIn(specialistIds);
        
        // Batch fetch milestones để tránh N+1 query
        Map<String, ContractMilestone> milestoneCache = new HashMap<>();
        assignments.forEach(assignment -> {
            String key = assignment.getMilestoneId() + ":" + assignment.getContractId();
            if (!milestoneCache.containsKey(key)) {
                contractMilestoneRepository
                    .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
                    .ifPresent(milestone -> milestoneCache.put(key, milestone));
            }
        });
        
        // KHÔNG enrich specialist info vì:
        // 1. Đây là internal API được gọi từ specialist-service (tránh circular dependency)
        // 2. Chỉ dùng để tính stats (totalOpenTasks, tasksInSlaWindow), không cần specialist info
        // 3. Nếu cần specialist info, nên enrich ở nơi gọi hoặc ở API public khác
        
        // Group by specialistId và enrich chỉ milestone info
        Map<String, List<TaskAssignmentResponse>> result = new HashMap<>();
        assignments.stream()
            .collect(Collectors.groupingBy(
                TaskAssignment::getSpecialistId,
                Collectors.mapping(
                    assignment -> enrichTaskAssignmentForBatch(assignment, milestoneCache),
                    Collectors.toList()
                )
            ))
            .forEach((specialistId, responses) -> result.put(specialistId, responses));
        
        // Đảm bảo tất cả specialistIds đều có trong result (kể cả không có task)
        specialistIds.forEach(id -> result.putIfAbsent(id, new ArrayList<>()));
        
        return result;
    }

    /**
     * Tính thống kê task (totalOpenTasks, tasksInSlaWindow) cho nhiều specialists cùng lúc
     * Đồng thời trả về danh sách specialist IDs đã cancelled task cho milestone (nếu có milestoneId)
     */
    public TaskStatsResponse getTaskStats(TaskStatsRequest request) {
        if (request == null || request.getSpecialistIds() == null || request.getSpecialistIds().isEmpty()) {
            return TaskStatsResponse.builder()
                .statsBySpecialist(new HashMap<>())
                .cancelledSpecialistIds(List.of())
                .build();
        }

        List<String> specialistIds = request.getSpecialistIds().stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(id -> !id.isEmpty())
            .distinct()
            .toList();

        if (specialistIds.isEmpty()) {
            return TaskStatsResponse.builder()
                .statsBySpecialist(new HashMap<>())
                .cancelledSpecialistIds(List.of())
                .build();
        }

        // Tính SLA window start (chung cho tất cả specialists)
        LocalDateTime slaWindowStart = calculateSlaWindowStartInternal(request.getContractId(), request.getMilestoneId());
        
        // Tính SLA window end cho từng specialist (có tính đến revision deadline)
        // Mỗi specialist có thể có revision deadline khác nhau, nên cần tính riêng
        List<TaskAssignment> assignments = taskAssignmentRepository.findBySpecialistIdIn(specialistIds);

        Map<String, List<TaskAssignment>> assignmentsBySpecialist = assignments.stream()
            .collect(Collectors.groupingBy(TaskAssignment::getSpecialistId));

        Map<String, SpecialistTaskStats> result = new HashMap<>();

        // Tính SLA window end (chung cho tất cả specialists, chỉ dùng milestone deadline)
        // Không cần tính revision deadline vì milestone đang muốn assign chưa có task
        LocalDateTime slaWindowEnd = calculateSlaWindowEndInternal(request.getContractId(), request.getMilestoneId());

        assignmentsBySpecialist.forEach((specialistId, tasks) -> {
            // Đếm tasks đang active
            int totalOpenTasks = (int) tasks.stream()
                .filter(task -> isOpenStatus(task.getStatus()))
                .count();

            int tasksInSlaWindow = 0;
            if (slaWindowStart != null && slaWindowEnd != null) {
                tasksInSlaWindow = (int) tasks.stream()
                    .filter(task -> isOpenStatus(task.getStatus()))  // Bao gồm cả in_revision
                    .map(task -> {
                        LocalDateTime deadline = resolveTaskDeadline(task);
                        // Debug log
                        if (deadline == null) {
                            log.debug("Task {} has null deadline. MilestoneId={}, ContractId={}, Status={}",
                                task.getAssignmentId(), task.getMilestoneId(), task.getContractId(), task.getStatus());
                        } else {
                            boolean inWindow = !deadline.isBefore(slaWindowStart) && !deadline.isAfter(slaWindowEnd);
                            log.debug("Task {} deadline={}, window=[{}, {}], inWindow={}",
                                task.getAssignmentId(), deadline, slaWindowStart, slaWindowEnd, inWindow);
                        }
                        return deadline;
                    })
                    .filter(deadline -> deadline != null
                        && !deadline.isBefore(slaWindowStart)  // >= milestone start
                        && !deadline.isAfter(slaWindowEnd))     // <= milestone deadline
                    .count();
                
                log.debug("Specialist {}: totalOpenTasks={}, tasksInSlaWindow={}, window=[{}, {}]",
                    specialistId, totalOpenTasks, tasksInSlaWindow, slaWindowStart, slaWindowEnd);
            } else {
                log.debug("Specialist {}: slaWindowStart={}, slaWindowEnd={} (null, cannot calculate tasksInSlaWindow)",
                    specialistId, slaWindowStart, slaWindowEnd);
            }

            result.put(specialistId, SpecialistTaskStats.builder()
                .totalOpenTasks(totalOpenTasks)
                .tasksInSlaWindow(tasksInSlaWindow)
                .build());
        });

        specialistIds.forEach(id -> result.putIfAbsent(id,
            SpecialistTaskStats.builder()
                .totalOpenTasks(0)
                .tasksInSlaWindow(0)
                .build()
        ));

        // Nếu có milestoneId và contractId, lấy danh sách specialist đã cancelled task cho milestone này
        List<String> cancelledSpecialistIds = List.of();
        if (request.getMilestoneId() != null && !request.getMilestoneId().isBlank()
            && request.getContractId() != null && !request.getContractId().isBlank()) {
            cancelledSpecialistIds = taskAssignmentRepository
                .findDistinctSpecialistIdsByContractIdAndMilestoneIdAndStatus(
                    request.getContractId(), 
                    request.getMilestoneId(), 
                    AssignmentStatus.cancelled
                );
        }

        return TaskStatsResponse.builder()
            .statsBySpecialist(result)
            .cancelledSpecialistIds(cancelledSpecialistIds)
            .build();
    }

    private boolean isOpenStatus(AssignmentStatus status) {
        return status == AssignmentStatus.assigned
            || status == AssignmentStatus.accepted_waiting
            || status == AssignmentStatus.ready_to_start
            || status == AssignmentStatus.in_progress
            || status == AssignmentStatus.ready_for_review      // Đã submit, chờ manager review (có thể bị reject → cần làm lại)
            || status == AssignmentStatus.revision_requested    // Manager yêu cầu chỉnh sửa (specialist cần làm)
            || status == AssignmentStatus.in_revision           // Customer yêu cầu revision, specialist đang làm
            || status == AssignmentStatus.delivery_pending;    // Đã được approve, chờ specialist deliver files
            // Không bao gồm waiting_customer_review vì specialist đã deliver, không cần làm gì nữa
            // Không bao gồm completed và cancelled vì đã hoàn thành hoặc hủy
    }

    private LocalDateTime resolveTaskDeadline(TaskAssignment assignment) {
        if (assignment.getMilestoneId() == null || assignment.getContractId() == null) {
            return null;
        }

        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
            .orElse(null);

        if (milestone == null) {
            return null;
        }

        // Fetch contract để lấy workStartAt nếu milestone chưa Start Work
        Contract contract = contractRepository.findById(assignment.getContractId()).orElse(null);

        // Dùng resolveMilestoneDeadlineWithFallback để có logic fallback (ước tính deadline)
        return resolveMilestoneDeadlineWithFallback(milestone, contract, assignment.getContractId());
    }

    /**
     * Helper: Fetch milestone và contract từ DB
     */
    private ContractMilestoneAndContract fetchMilestoneAndContract(String contractId, String milestoneId) {
        if (contractId == null || contractId.isBlank() || milestoneId == null || milestoneId.isBlank()) {
            return null;
        }

        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElse(null);
        
        if (milestone == null) {
            return null;
        }

        Contract contract = contractRepository.findById(contractId).orElse(null);
        return new ContractMilestoneAndContract(milestone, contract, contractId);
    }

    private LocalDateTime calculateSlaWindowStartInternal(String contractId, String milestoneId) {
        ContractMilestoneAndContract data = fetchMilestoneAndContract(contractId, milestoneId);
        return data != null ? resolveMilestoneStartWithFallback(data.milestone, data.contract, data.contractId) : null;
    }

    private LocalDateTime calculateSlaWindowEndInternal(String contractId, String milestoneId) {
        ContractMilestoneAndContract data = fetchMilestoneAndContract(contractId, milestoneId);
        LocalDateTime milestoneDeadline = data != null ? resolveMilestoneDeadlineWithFallback(data.milestone, data.contract, data.contractId) : null;
        return milestoneDeadline;
    }

    /**
     * Helper class để trả về milestone và contract cùng lúc
     */
    private static class ContractMilestoneAndContract {
        final ContractMilestone milestone;
        final Contract contract;
        final String contractId;

        ContractMilestoneAndContract(ContractMilestone milestone, Contract contract, String contractId) {
            this.milestone = milestone;
            this.contract = contract;
            this.contractId = contractId;
        }
    }

    private LocalDateTime resolveMilestoneStartWithFallback(
            ContractMilestone milestone, Contract contract, String contractId) {
        // Ưu tiên dùng actualStartAt nếu có
        if (milestone != null && milestone.getActualStartAt() != null) {
            return milestone.getActualStartAt();
        }
        
        // Tính plannedStartAt (có fallback ước tính nếu contract chưa Start Work)
        LocalDateTime plannedStartAt = calculatePlannedStartAtWithFallback(milestone, contract, contractId);
        return plannedStartAt;
    }

    private LocalDateTime resolveMilestoneDeadlineWithFallback(
            ContractMilestone milestone, Contract contract, String contractId) {
        // SLA window end / deadline dùng để check workload phải là deadline mục tiêu (hard/target),
        // không dùng actualEndAt (mốc hoàn thành) để tránh "deadline = lúc xong".
        LocalDateTime deadline = resolveMilestoneTargetDeadline(milestone);
        if (deadline != null) {
            return deadline;
        }
        
        // Fallback: Tính deadline dựa trên plannedStartAt của milestone
        Integer slaDays = milestone != null ? milestone.getMilestoneSlaDays() : null;
        if (slaDays == null || slaDays <= 0) {
            return null;
        }
        
        LocalDateTime plannedStartAt = calculatePlannedStartAtWithFallback(milestone, contract, contractId);
        return plannedStartAt != null ? plannedStartAt.plusDays(slaDays) : null;
    }

    /**
     * Tính plannedStartAt với fallback: nếu contract đã Start Work thì dùng planned, nếu chưa thì ước tính
     */
    private LocalDateTime calculatePlannedStartAtWithFallback(
            ContractMilestone milestone, Contract contract, String contractId) {
        // Nếu contract đã Start Work, tính plannedStartAt của milestone này
        if (contract != null && contract.getWorkStartAt() != null) {
            LocalDateTime plannedStartAt = calculatePlannedStartAtForMilestone(milestone, contract, contractId);
            if (plannedStartAt != null) {
                return plannedStartAt;
            }
        }
        
        // Nếu contract chưa Start Work, ước tính start dựa trên giả định "nếu Start Work hôm nay"
        return calculateEstimatedPlannedStartAtForMilestone(milestone, contractId);
    }

    /**
     * Tính plannedStartAt của milestone dựa trên milestone trước đó (giống logic trong calculatePlannedDatesForAllMilestones)
     */
    private LocalDateTime calculatePlannedStartAtForMilestone(
            ContractMilestone milestone, Contract contract, String contractId) {
        if (milestone == null || contract == null || contractId == null) {
            return null;
        }
        
        // Nếu milestone đã có plannedStartAt, dùng luôn
        if (milestone.getPlannedStartAt() != null) {
            return milestone.getPlannedStartAt();
        }
        
        // Nếu milestone là milestone đầu tiên (orderIndex = 1), dùng workStartAt
        if (milestone.getOrderIndex() != null && milestone.getOrderIndex() == 1) {
            return contract.getWorkStartAt();
        }
        
        // Nếu không phải milestone đầu tiên, tìm milestone trước đó
        List<ContractMilestone> allMilestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        
        if (allMilestones.isEmpty()) {
            return null;
        }
        
        // Tìm milestone trước đó (orderIndex - 1)
        Integer currentOrderIndex = milestone.getOrderIndex();
        if (currentOrderIndex == null || currentOrderIndex <= 1) {
            // Nếu không có orderIndex hoặc là milestone đầu tiên, dùng workStartAt
            return contract.getWorkStartAt();
        }
        
        ContractMilestone previousMilestone = allMilestones.stream()
            .filter(m -> m.getOrderIndex() != null && m.getOrderIndex() == currentOrderIndex - 1)
            .findFirst()
            .orElse(null);
        
        if (previousMilestone == null) {
            // Không tìm thấy milestone trước đó, dùng workStartAt
            return contract.getWorkStartAt();
        }
        
        // Tính plannedStartAt của milestone hiện tại = plannedDueDate của milestone trước đó
        LocalDateTime previousPlannedDueDate = null;
        if (previousMilestone.getPlannedDueDate() != null) {
            previousPlannedDueDate = previousMilestone.getPlannedDueDate();
        } else if (previousMilestone.getPlannedStartAt() != null && previousMilestone.getMilestoneSlaDays() != null) {
            previousPlannedDueDate = previousMilestone.getPlannedStartAt().plusDays(previousMilestone.getMilestoneSlaDays());
        }
        if (previousPlannedDueDate != null) {
            return previousPlannedDueDate;
        }
        
        // Nếu milestone trước đó cũng chưa có deadline, tính lại từ đầu
        // Tính plannedStartAt của milestone trước đó trước
        LocalDateTime previousPlannedStartAt = calculatePlannedStartAtForMilestone(
            previousMilestone, contract, contractId);
        if (previousPlannedStartAt != null && previousMilestone.getMilestoneSlaDays() != null) {
            return previousPlannedStartAt.plusDays(previousMilestone.getMilestoneSlaDays());
        }
        
        // Fallback: dùng workStartAt
        return contract.getWorkStartAt();
    }

    /**
     * Tính plannedStartAt ước tính của milestone khi contract chưa Start Work
     * (dựa trên giả định "nếu Start Work hôm nay")
     * Điều này giúp manager đánh giá workload khi đang assign task (trước khi Start Work)
     */
    private LocalDateTime calculateEstimatedPlannedStartAtForMilestone(
            ContractMilestone milestone, String contractId) {
        if (milestone == null || contractId == null) {
            return null;
        }
        
        // Nếu milestone là milestone đầu tiên (orderIndex = 1), dùng now
        if (milestone.getOrderIndex() != null && milestone.getOrderIndex() == 1) {
            return LocalDateTime.now();
        }
        
        // Nếu không phải milestone đầu tiên, tính dựa trên milestone trước đó
        List<ContractMilestone> allMilestones = contractMilestoneRepository
            .findByContractIdOrderByOrderIndexAsc(contractId);
        
        if (allMilestones.isEmpty()) {
            return null;
        }
        
        // Tìm milestone trước đó (orderIndex - 1)
        Integer currentOrderIndex = milestone.getOrderIndex();
        if (currentOrderIndex == null || currentOrderIndex <= 1) {
            // Nếu không có orderIndex hoặc là milestone đầu tiên, dùng now
            return LocalDateTime.now();
        }
        
        ContractMilestone previousMilestone = allMilestones.stream()
            .filter(m -> m.getOrderIndex() != null && m.getOrderIndex() == currentOrderIndex - 1)
            .findFirst()
            .orElse(null);
        
        if (previousMilestone == null) {
            // Không tìm thấy milestone trước đó, dùng now
            return LocalDateTime.now();
        }
        
        // Tính plannedStartAt ước tính của milestone hiện tại = deadline ước tính của milestone trước đó
        LocalDateTime previousEstimatedDeadline = calculateEstimatedDeadlineForMilestone(previousMilestone, contractId);
        if (previousEstimatedDeadline != null) {
            return previousEstimatedDeadline;
        }
        
        // Nếu milestone trước đó cũng chưa có deadline, tính lại từ đầu
        LocalDateTime previousEstimatedStartAt = calculateEstimatedPlannedStartAtForMilestone(
            previousMilestone, contractId);
        if (previousEstimatedStartAt != null && previousMilestone.getMilestoneSlaDays() != null) {
            return previousEstimatedStartAt.plusDays(previousMilestone.getMilestoneSlaDays());
        }
        
        // Fallback: dùng now
        return LocalDateTime.now();
    }

    /**
     * Tính deadline ước tính của milestone khi contract chưa Start Work
     */
    private LocalDateTime calculateEstimatedDeadlineForMilestone(
            ContractMilestone milestone, String contractId) {
        if (milestone == null) {
            return null;
        }
        
        // Thử dùng deadline mục tiêu (hard/target) trước (nếu có planned/booking/arrangement-paid)
        LocalDateTime deadline = resolveMilestoneTargetDeadline(milestone);
        if (deadline != null) {
            return deadline;
        }
        
        // Nếu chưa có, tính ước tính
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (slaDays == null || slaDays <= 0) {
            return null;
        }
        
        LocalDateTime estimatedStartAt = calculateEstimatedPlannedStartAtForMilestone(milestone, contractId);
        if (estimatedStartAt != null) {
            return estimatedStartAt.plusDays(slaDays);
        }
        
        return null;
    }

    /**
     * Target deadline (deadline mục tiêu / hard deadline) để FE check trễ hẹn + tính SLA window workload.
     *
     * QUAN TRỌNG:
     * - Không trả về actualEndAt (vì đó là mốc hoàn thành/thanh toán, không phải deadline mục tiêu).
     * - Recording milestone:
     *   - Workflow 3 (arrangement_with_recording): hard deadline = last arrangement actualEndAt (paid) + SLA days (booking không dời deadline)
     *   - Workflow 4 (recording-only): deadline = bookingDate(+startTime) + SLA days
     * 
     * Version có cache để tránh N+1 query (dùng trong batch operations)
     */
    
    private LocalDateTime resolveMilestoneTargetDeadlineWithCache(
            ContractMilestone milestone,
            Map<String, Contract> contractsForDeadline,
            Map<String, StudioBooking> bookingsByMilestoneId,
            Map<String, List<ContractMilestone>> milestonesByContractId,
            Map<String, ContractMilestone> lastArrangementMilestoneByContractId) {
        if (milestone == null) {
            return null;
        }
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (slaDays == null || slaDays <= 0) {
            return null;
        }

        // Recording milestone: special rules by contract type
        if (milestone.getMilestoneType() == MilestoneType.recording) {
            Contract contract = contractsForDeadline != null 
                ? contractsForDeadline.get(milestone.getContractId())
                : null;

            // Workflow 3: arrangement_with_recording => hard deadline from last arrangement actualEndAt + SLA (ignore booking)
            if (contract != null && contract.getContractType() == ContractType.arrangement_with_recording) {
                // Tối ưu: Chỉ dùng cache đã filter sẵn, bỏ các fallback để tránh chậm
                // Note: lastArrangementMilestoneByContractId luôn được tạo ở Step 4, nên không cần check null
                ContractMilestone lastArrangementMilestone = lastArrangementMilestoneByContractId != null
                    ? lastArrangementMilestoneByContractId.get(milestone.getContractId())
                    : null;
                
                // Nếu có last arrangement milestone và đã thanh toán (actualEndAt != null)
                if (lastArrangementMilestone != null && lastArrangementMilestone.getActualEndAt() != null) {
                    return lastArrangementMilestone.getActualEndAt().plusDays(slaDays);
                }
                // If arrangement not paid yet (actualEndAt == null) hoặc không có arrangement milestone => fallback to planned
            } else if (contract != null && contract.getContractType() == ContractType.recording) {
                // Workflow 4 (recording-only): prefer booking date if active
                // Tối ưu: Chỉ dùng cache, bỏ fallback query để tránh chậm
                if (bookingsByMilestoneId != null) {
                    StudioBooking booking = bookingsByMilestoneId.get(milestone.getMilestoneId());
                    if (booking != null) {
                        List<BookingStatus> activeStatuses = List.of(
                            BookingStatus.TENTATIVE, BookingStatus.PENDING,
                            BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
                        if (activeStatuses.contains(booking.getStatus()) && booking.getBookingDate() != null) {
                            LocalTime startTime = booking.getStartTime() != null
                                ? booking.getStartTime()
                                : LocalTime.of(8, 0);
                            LocalDateTime startAt = booking.getBookingDate().atTime(startTime);
                            return startAt.plusDays(slaDays);
                        }
                    }
                }
            }

            // Fallback for recording: planned dates (baseline)
            if (milestone.getPlannedDueDate() != null) {
                return milestone.getPlannedDueDate();
            }
            if (milestone.getPlannedStartAt() != null) {
                return milestone.getPlannedStartAt().plusDays(slaDays);
            }
            return null;
        }

        // Other milestones: target deadline is based on actualStartAt (once started), otherwise planned
        if (milestone.getActualStartAt() != null) {
            return milestone.getActualStartAt().plusDays(slaDays);
        }
        if (milestone.getPlannedDueDate() != null) {
            return milestone.getPlannedDueDate();
        }
        if (milestone.getPlannedStartAt() != null) {
            return milestone.getPlannedStartAt().plusDays(slaDays);
        }
        return null;
    }

    /**
     * Target deadline (deadline mục tiêu / hard deadline) để FE check trễ hẹn + tính SLA window workload.
     *
     * QUAN TRỌNG:
     * - Không trả về actualEndAt (vì đó là mốc hoàn thành/thanh toán, không phải deadline mục tiêu).
     * - Recording milestone:
     *   - Workflow 3 (arrangement_with_recording): hard deadline = last arrangement actualEndAt (paid) + SLA days (booking không dời deadline)
     *   - Workflow 4 (recording-only): deadline = bookingDate(+startTime) + SLA days
     * 
     * Version không có cache (dùng cho single assignment operations)
     */
    private LocalDateTime resolveMilestoneTargetDeadline(ContractMilestone milestone) {
        if (milestone == null) {
            return null;
        }
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (slaDays == null || slaDays <= 0) {
            return null;
        }

        // Recording milestone: special rules by contract type
        if (milestone.getMilestoneType() == MilestoneType.recording) {
            Contract contract = null;
            try {
                contract = contractRepository.findById(milestone.getContractId()).orElse(null);
            } catch (Exception e) {
                log.warn("Failed to fetch contract for recording target deadline: milestoneId={}, error={}",
                    milestone.getMilestoneId(), e.getMessage());
            }

            // Workflow 3: arrangement_with_recording => hard deadline from last arrangement actualEndAt + SLA (ignore booking)
            if (contract != null && contract.getContractType() == ContractType.arrangement_with_recording) {
                try {
                    List<ContractMilestone> allContractMilestones = contractMilestoneRepository
                        .findByContractIdOrderByOrderIndexAsc(milestone.getContractId());
                    ContractMilestone lastArrangementMilestone = allContractMilestones.stream()
                        .filter(m -> m.getMilestoneType() == MilestoneType.arrangement)
                        .max(Comparator.comparing(ContractMilestone::getOrderIndex))
                        .orElse(null);

                    if (lastArrangementMilestone != null && lastArrangementMilestone.getActualEndAt() != null) {
                        return lastArrangementMilestone.getActualEndAt().plusDays(slaDays);
                    }
                } catch (Exception e) {
                    log.error("Error calculating recording target deadline for arrangement_with_recording: milestoneId={}, error={}",
                        milestone.getMilestoneId(), e.getMessage());
                }
                // If arrangement not paid yet => fallback to planned
            } else if (contract != null && contract.getContractType() == ContractType.recording) {
                // Workflow 4 (recording-only): prefer booking date if active
                try {
                    Optional<StudioBooking> bookingOpt =
                        studioBookingRepository.findByMilestoneId(milestone.getMilestoneId());
                    if (bookingOpt.isPresent()) {
                        StudioBooking booking = bookingOpt.get();
                        List<BookingStatus> activeStatuses = List.of(
                            BookingStatus.TENTATIVE, BookingStatus.PENDING,
                            BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS);
                        if (activeStatuses.contains(booking.getStatus()) && booking.getBookingDate() != null) {
                            LocalTime startTime = booking.getStartTime() != null
                                ? booking.getStartTime()
                                : LocalTime.of(8, 0);
                            LocalDateTime startAt = booking.getBookingDate().atTime(startTime);
                            return startAt.plusDays(slaDays);
                        }
                    }
                } catch (Exception e) {
                    log.error("Error fetching booking for recording target deadline: milestoneId={}, error={}",
                        milestone.getMilestoneId(), e.getMessage());
                }
            }

            // Fallback for recording: planned dates (baseline)
            if (milestone.getPlannedDueDate() != null) {
                return milestone.getPlannedDueDate();
            }
            if (milestone.getPlannedStartAt() != null) {
                return milestone.getPlannedStartAt().plusDays(slaDays);
            }
            return null;
        }

        // Other milestones: target deadline is based on actualStartAt (once started), otherwise planned
        if (milestone.getActualStartAt() != null) {
            return milestone.getActualStartAt().plusDays(slaDays);
        }
        if (milestone.getPlannedDueDate() != null) {
            return milestone.getPlannedDueDate();
        }
        if (milestone.getPlannedStartAt() != null) {
            return milestone.getPlannedStartAt().plusDays(slaDays);
        }
        return null;
    }
    
    /**
     * Enrich task assignment cho batch API (chỉ enrich milestone info, KHÔNG enrich specialist info)
     * Vì đây là internal API được gọi từ specialist-service, tránh circular dependency
     */
    private TaskAssignmentResponse enrichTaskAssignmentForBatch(
            TaskAssignment assignment, 
            Map<String, ContractMilestone> milestoneCache) {
        TaskAssignmentResponse response = taskAssignmentMapper.toResponse(assignment);
        
        // Enrich milestone info (từ cache)
        String key = assignment.getMilestoneId() + ":" + assignment.getContractId();
        ContractMilestone milestone = milestoneCache.get(key);
        if (milestone != null) {
            LocalDateTime targetDeadline = resolveMilestoneTargetDeadline(milestone);
            Boolean firstSubmissionLate = null;
            Boolean overdueNow = null;
            if (targetDeadline != null) {
                if (milestone.getFirstSubmissionAt() != null) {
                    firstSubmissionLate = milestone.getFirstSubmissionAt().isAfter(targetDeadline);
                    overdueNow = false;
                } else {
                    overdueNow = LocalDateTime.now().isAfter(targetDeadline);
                }
            }
            TaskAssignmentResponse.MilestoneInfo milestoneInfo = TaskAssignmentResponse.MilestoneInfo.builder()
                .milestoneId(milestone.getMilestoneId())
                .name(milestone.getName())
                .description(milestone.getDescription())
                .contractId(milestone.getContractId())
                .orderIndex(milestone.getOrderIndex())
                .plannedStartAt(milestone.getPlannedStartAt())
                .plannedDueDate(milestone.getPlannedDueDate())
                .actualStartAt(milestone.getActualStartAt())
                .actualEndAt(milestone.getActualEndAt())
                .firstSubmissionAt(milestone.getFirstSubmissionAt())
                .finalCompletedAt(milestone.getFinalCompletedAt())
                .milestoneSlaDays(milestone.getMilestoneSlaDays())
                .milestoneType(milestone.getMilestoneType() != null ? milestone.getMilestoneType().name() : null)
                .targetDeadline(targetDeadline)
                .firstSubmissionLate(firstSubmissionLate)
                .overdueNow(overdueNow)
                .build();
            response.setMilestone(milestoneInfo);
        }
        
        // KHÔNG enrich specialist info (tránh circular dependency với specialist-service)
        
        return response;
    }

    /**
     * Enrich TaskAssignmentResponse với milestone info từ batch-fetched milestones
     */
    private TaskAssignmentResponse enrichTaskAssignmentWithMilestones(
            TaskAssignment assignment,
            List<ContractMilestone> milestones,
            LocalDateTime now) {
        TaskAssignmentResponse response = taskAssignmentMapper.toResponse(assignment);
        
        if (assignment.getMilestoneId() != null && assignment.getContractId() != null) {
            ContractMilestone milestone = milestones.stream()
                .filter(m -> assignment.getMilestoneId().equals(m.getMilestoneId()) 
                          && assignment.getContractId().equals(m.getContractId()))
                .findFirst()
                .orElse(null);
            if (milestone != null) {
                enrichMilestoneInfoFromCache(response, milestone, assignment.getContractId(), now);
            }
        }
        
        return response;
    }

    /**
     * Enrich TaskAssignmentResponse với milestone info (fetch từ DB - dùng cho single assignment)
     */
    private TaskAssignmentResponse enrichTaskAssignment(TaskAssignment assignment) {
        TaskAssignmentResponse response = taskAssignmentMapper.toResponse(assignment);
        enrichMilestoneInfo(response, assignment.getMilestoneId(), assignment.getContractId());
        return response;
    }

    /**
     * Enrich milestone info từ cache (không query DB)
     * NOTE: Không fetch arrangement submissions ở đây vì không cần cho list view
     * Chỉ fetch khi mở detail view (trong getTaskAssignmentDetail API)
     * Đơn giản hóa: targetDeadline tính từ plannedDueDate hoặc actualStartAt + SLA
     */
    private void enrichMilestoneInfoFromCache(
            TaskAssignmentResponse response, 
            ContractMilestone milestone,
            String contractId,
            LocalDateTime now) {
        if (response == null || milestone == null) {
            return;
        }

        try {
            LocalDateTime estimatedDeadline = null;
            LocalDateTime targetDeadline = null;
            LocalDateTime plannedDeadline = milestone.getPlannedDueDate() != null 
                ? milestone.getPlannedDueDate() 
                : (milestone.getPlannedStartAt() != null && milestone.getMilestoneSlaDays() != null
                    ? milestone.getPlannedStartAt().plusDays(milestone.getMilestoneSlaDays())
                    : null);
            
            // Tính targetDeadline đơn giản: actualStartAt + SLA hoặc plannedDueDate
            Integer slaDays = milestone.getMilestoneSlaDays();
            if (milestone.getActualStartAt() != null && slaDays != null && slaDays > 0) {
                targetDeadline = milestone.getActualStartAt().plusDays(slaDays);
            } else if (plannedDeadline != null) {
                targetDeadline = plannedDeadline;
            } else if (milestone.getPlannedStartAt() != null && slaDays != null && slaDays > 0) {
                targetDeadline = milestone.getPlannedStartAt().plusDays(slaDays);
            }
            
            estimatedDeadline = null;
            
            TaskAssignmentResponse.MilestoneInfo milestoneInfo = taskAssignmentMapper.toMilestoneInfo(milestone);
            
            // Set các field computed (không thể map tự động)
            milestoneInfo.setTargetDeadline(targetDeadline);
            milestoneInfo.setEstimatedDeadline(estimatedDeadline);
            milestoneInfo.setFirstSubmissionLate(
                (milestone.getFirstSubmissionAt() != null && targetDeadline != null)
                    ? milestone.getFirstSubmissionAt().isAfter(targetDeadline)
                    : null
            );
            milestoneInfo.setOverdueNow(
                targetDeadline != null
                    ? (milestone.getFirstSubmissionAt() == null && now.isAfter(targetDeadline))
                    : null
            );
            milestoneInfo.setSourceArrangementSubmission(null); // Không fetch cho list view, chỉ fetch trong detail view
            
            response.setMilestone(milestoneInfo);
        } catch (Exception e) {
            log.warn("Error enriching milestone info for milestoneId={}, contractId={}: {}", 
                milestone.getMilestoneId(), contractId, e.getMessage());
        }
    }

    private void enrichMilestoneInfo(TaskAssignmentResponse response, String milestoneId, String contractId) {
        if (response == null || milestoneId == null || contractId == null) {
            return;
        }

        try {
            ContractMilestone milestone = contractMilestoneRepository
                .findByMilestoneIdAndContractId(milestoneId, contractId)
                .orElse(null);
            if (milestone != null) {
                // Tính estimated deadline chỉ khi chưa có actual deadline và planned deadline
                LocalDateTime estimatedDeadline = null;
                LocalDateTime targetDeadline = resolveMilestoneTargetDeadline(milestone);
                LocalDateTime plannedDeadline = milestone.getPlannedDueDate() != null 
                    ? milestone.getPlannedDueDate() 
                    : (milestone.getPlannedStartAt() != null && milestone.getMilestoneSlaDays() != null
                        ? milestone.getPlannedStartAt().plusDays(milestone.getMilestoneSlaDays())
                        : null);
                
                // Chỉ tính estimated deadline khi không có target và planned
                if (targetDeadline == null && plannedDeadline == null) {
                    estimatedDeadline = calculateEstimatedDeadlineForMilestone(milestone, contractId);
                }
                
                // Fetch arrangement submission nếu có sourceArrangementSubmissionId (gọi từ ContractMilestoneService)
                TaskAssignmentResponse.ArrangementSubmissionInfo arrangementSubmissionInfo = 
                    contractMilestoneService.enrichMilestoneWithArrangementSubmission(milestone);
                
                // Dùng MapStruct mapper để map các field đơn giản
                TaskAssignmentResponse.MilestoneInfo milestoneInfo = taskAssignmentMapper.toMilestoneInfo(milestone);
                
                // Set các field computed (không thể map tự động)
                milestoneInfo.setTargetDeadline(targetDeadline);
                milestoneInfo.setEstimatedDeadline(estimatedDeadline);
                milestoneInfo.setFirstSubmissionLate(
                    (milestone.getFirstSubmissionAt() != null && targetDeadline != null)
                        ? milestone.getFirstSubmissionAt().isAfter(targetDeadline)
                        : null
                );
                milestoneInfo.setOverdueNow(
                    targetDeadline != null
                        ? (milestone.getFirstSubmissionAt() == null && LocalDateTime.now().isAfter(targetDeadline))
                        : null
                );
                milestoneInfo.setSourceArrangementSubmission(arrangementSubmissionInfo);
                
                response.setMilestone(milestoneInfo);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch milestone info: milestoneId={}, contractId={}, error={}", 
                milestoneId, contractId, e.getMessage());
        }
    }

    private String asString(Object value) {
        return value != null ? value.toString() : null;
    }

    /**
     * Lấy danh sách milestone slots phục vụ assign task (paginate/filter ở FE).
     */
    public MilestoneAssignmentSlotsResult getMilestoneAssignmentSlots(
            String contractId,
            String status,
            String keyword,
            Boolean onlyUnassigned,
            int page,
            int size) {

        long totalStart = System.currentTimeMillis();
        log.info("[Performance] ===== getMilestoneAssignmentSlots STARTED - contractId={}, status={}, keyword={}, onlyUnassigned={}, page={}, size={} =====",
            contractId, status, keyword, onlyUnassigned, page, size);

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 10 : size;

        String managerUserId = getCurrentUserId();
        List<Contract> contracts;
        
        long step1Start = System.currentTimeMillis();

        if (contractId != null && !contractId.isBlank()) {
            Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));
            verifyManagerPermission(contract);
            // Lấy contract nếu status là signed, active hoặc completed
            // Cho phép xem milestones từ khi contract đã signed (để manager chuẩn bị)
            // Nhưng chỉ có thể assign task khi contract đã active (trong createTaskAssignment)
            ContractStatus contractStatus = contract.getStatus();
            if (contractStatus == ContractStatus.signed ||
                contractStatus == ContractStatus.active_pending_assignment || 
                contractStatus == ContractStatus.active ||
                contractStatus == ContractStatus.completed) {
                contracts = List.of(contract);
            } else {
                contracts = List.of(); // Contract chưa signed hoặc đã bị cancel/reject, không hiển thị milestones
            }
        } else {
            // Tối ưu: Filter ở database level thay vì fetch tất cả rồi filter ở memory
            // Tối ưu thêm: Dùng projection query để chỉ fetch các field cần thiết (giảm data transfer)
            List<ContractStatus> allowedStatuses = List.of(
                ContractStatus.signed,
                ContractStatus.active_pending_assignment,
                ContractStatus.active,
                ContractStatus.completed
            );
            List<ContractBasicInfo> contractBasicInfos = 
                contractRepository.findBasicInfoByManagerUserIdAndStatusIn(managerUserId, allowedStatuses);
            
            // Convert projection to Contract objects (chỉ với các field cần thiết)
            // Note: Contract extends BaseEntity, createdAt is inherited
            contracts = contractBasicInfos.stream()
                .<Contract>map(info -> {
                    Contract contract = Contract.builder()
                        .contractId(info.getContractId())
                        .contractNumber(info.getContractNumber())
                        .contractType(info.getContractType())
                        .nameSnapshot(info.getNameSnapshot())
                        .status(info.getStatus())
                        .build();
                    // Set createdAt from BaseEntity (if available)
                    if (info.getCreatedAt() != null) {
                        contract.setCreatedAt(info.getCreatedAt());
                    }
                    return contract;
                })
                .collect(Collectors.toList());
        }
        log.info("[Performance] Step 1 - Fetch contracts: {}ms (found {} contracts)", 
            System.currentTimeMillis() - step1Start, contracts.size());

        if (contracts.isEmpty()) {
            return MilestoneAssignmentSlotsResult.builder()
                .page(PageResponse.<MilestoneAssignmentSlotResponse>builder()
                    .content(List.of())
                    .pageNumber(safePage)
                    .pageSize(safeSize)
                    .totalElements(0)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .hasNext(false)
                    .hasPrevious(false)
                    .build())
                .totalUnassigned(0)
                .totalInProgress(0)
                .totalCompleted(0)
                .build();
        }

        Map<String, Contract> contractMap = contracts.stream()
            .collect(Collectors.toMap(Contract::getContractId, c -> c));
        List<String> contractIds = new ArrayList<>(contractMap.keySet());

        long step2Start = System.currentTimeMillis();
        List<ContractMilestone> milestones = contractMilestoneRepository.findByContractIdIn(contractIds);
        log.info("[Performance] Step 2 - Fetch milestones: {}ms (found {} milestones from {} contracts)", 
            System.currentTimeMillis() - step2Start, milestones.size(), contractIds.size());
        if (milestones.isEmpty()) {
            return MilestoneAssignmentSlotsResult.builder()
                .page(PageResponse.<MilestoneAssignmentSlotResponse>builder()
                    .content(List.of())
                    .pageNumber(safePage)
                    .pageSize(safeSize)
                    .totalElements(0)
                    .totalPages(0)
                    .first(true)
                    .last(true)
                    .hasNext(false)
                    .hasPrevious(false)
                    .build())
                .totalUnassigned(0)
                .totalInProgress(0)
                .totalCompleted(0)
                .build();
        }
        List<String> milestoneIds = milestones.stream()
            .map(ContractMilestone::getMilestoneId)
            .collect(Collectors.toList());

        long step3Start = System.currentTimeMillis();
        List<TaskAssignment> assignments = taskAssignmentRepository.findByMilestoneIdIn(milestoneIds);
        Map<String, TaskAssignment> assignmentMap = assignments.stream()
            .collect(Collectors.groupingBy(TaskAssignment::getMilestoneId,
                Collectors.collectingAndThen(Collectors.toList(), this::pickLatestAssignment)));
        log.info("[Performance] Step 3 - Fetch assignments: {}ms (found {} assignments from {} milestones)", 
            System.currentTimeMillis() - step3Start, assignments.size(), milestoneIds.size());

        // Batch fetch tất cả milestones của contracts để tránh N+1 query khi check allArrangementsCompleted
        long step4Start = System.currentTimeMillis();
        // Sort milestones theo orderIndex một lần để tránh sort lại trong loop
        Map<String, List<ContractMilestone>> allMilestonesByContractId = contractMilestoneRepository
            .findByContractIdIn(contractIds)
            .stream()
            .collect(Collectors.groupingBy(
                ContractMilestone::getContractId,
                Collectors.collectingAndThen(
                    Collectors.toList(),
                    list -> list.stream()
                        .sorted(Comparator.comparing(ContractMilestone::getOrderIndex))
                        .collect(Collectors.toList())
                )
            ));
        
        // Cache arrangement milestones đã filter sẵn để tránh filter lại trong loop
        Map<String, ContractMilestone> lastArrangementMilestoneByContractId = new HashMap<>();
        for (Map.Entry<String, List<ContractMilestone>> entry : allMilestonesByContractId.entrySet()) {
            ContractMilestone lastArrangement = entry.getValue().stream()
                .filter(m -> m.getMilestoneType() == MilestoneType.arrangement)
                .max(Comparator.comparing(ContractMilestone::getOrderIndex))
                .orElse(null);
            if (lastArrangement != null) {
                lastArrangementMilestoneByContractId.put(entry.getKey(), lastArrangement);
            }
        }
        
        log.info("[Performance] Step 4 - Batch fetch all milestones for contracts: {}ms ({} contracts, {} with arrangements)", 
            System.currentTimeMillis() - step4Start, contractIds.size(), lastArrangementMilestoneByContractId.size());

        // Cache LocalDateTime.now() để tránh gọi nhiều lần trong loop
        final LocalDateTime now = LocalDateTime.now();

        long step5Start = System.currentTimeMillis();
        List<MilestoneAssignmentSlotResponse> slots = new ArrayList<>();
        
        // Performance tracking cho từng phần
        long timeFiltering = 0;
        long timeTargetDeadline = 0;
        long timeBuilding = 0;
        int filteredCount = 0;
        int targetDeadlineCount = 0;
        int builtCount = 0;

        for (ContractMilestone milestone : milestones) {
            long itemStart = System.currentTimeMillis();
            
            Contract contract = contractMap.get(milestone.getContractId());
            if (contract == null) {
                continue;
            }

            // Đảm bảo milestone chỉ khả dụng khi contract đã signed hoặc active hoặc completed
            // Loại bỏ milestones từ contracts chưa signed (draft, etc.) hoặc đã bị cancel/reject
            ContractStatus contractStatus = contract.getStatus();
            if (contractStatus != ContractStatus.signed &&
                contractStatus != ContractStatus.active_pending_assignment &&
                contractStatus != ContractStatus.active &&
                contractStatus != ContractStatus.completed) {
                continue; // Skip milestone nếu contract chưa signed hoặc đã bị cancel/reject
            }

            TaskAssignment assignment = assignmentMap.get(milestone.getMilestoneId());
            boolean isUnassigned = assignment == null || assignment.getStatus() == AssignmentStatus.cancelled;

            if (Boolean.TRUE.equals(onlyUnassigned) && !isUnassigned) {
                continue;
            }
            if (!matchesStatusFilter(milestone, assignment, status)) {
                continue;
            }
            
            long filterEnd = System.currentTimeMillis();
            timeFiltering += (filterEnd - itemStart);
            filteredCount++;

            // Check if last arrangement milestone is completed (for recording milestones)
            // Tối ưu: Dùng cache đã filter sẵn, không cần filter lại
            Boolean allArrangementsCompleted = null;
            if (milestone.getMilestoneType() == MilestoneType.recording && 
                contract.getContractType() == ContractType.arrangement_with_recording) {
                // Dùng cache đã filter sẵn (không cần filter lại)
                ContractMilestone lastArrangementMilestone = lastArrangementMilestoneByContractId
                    .get(contract.getContractId());
                
                if (lastArrangementMilestone != null) {
                    // Check workStatus: completed hoặc ready_for_payment
                    // ⚠️ QUAN TRỌNG: Cũng phải check actualEndAt (đã thanh toán) vì đây là điều kiện bắt buộc để tạo booking
                    // Frontend dùng field này để hiển thị button "Book Studio", nên cần check chính xác
                    boolean workStatusCompleted = 
                        lastArrangementMilestone.getWorkStatus() == MilestoneWorkStatus.COMPLETED ||
                        lastArrangementMilestone.getWorkStatus() == MilestoneWorkStatus.READY_FOR_PAYMENT;
                    boolean isPaid = lastArrangementMilestone.getActualEndAt() != null;
                    // Chỉ set true nếu vừa completed/ready_for_payment VÀ đã thanh toán
                    allArrangementsCompleted = workStatusCompleted && isPaid;
                } else {
                    allArrangementsCompleted = false; // Không có arrangement milestone
                }
            }

            // Target deadline (hard/target) for FE display
            // Tối ưu: Dùng cache thay vì query DB (tránh N+1 query)
            // resolveMilestoneTargetDeadlineWithCache đã xử lý đầy đủ các trường hợp và fallback
            long deadlineStart = System.currentTimeMillis();
            LocalDateTime targetDeadline = resolveMilestoneTargetDeadlineWithCache(
                milestone,
                contractMap,
                null, // bookingsByMilestoneId - không cần cho list view, có thể null
                allMilestonesByContractId,
                lastArrangementMilestoneByContractId); // Cache đã filter sẵn
            long deadlineEnd = System.currentTimeMillis();
            timeTargetDeadline += (deadlineEnd - deadlineStart);
            targetDeadlineCount++;

            // Bỏ tính estimated deadline (tránh N+1 query)
            // Frontend có thể tính đơn giản từ plannedStartAt + SLA nếu cần
            LocalDateTime estimatedDeadline = null;

            long buildStart = System.currentTimeMillis();
            MilestoneAssignmentSlotResponse slot = MilestoneAssignmentSlotResponse.builder()
                .contractId(contract.getContractId())
                .contractNumber(contract.getContractNumber())
                .contractType(contract.getContractType() != null ? contract.getContractType().name() : null)
                .customerName(contract.getNameSnapshot())
                .contractCreatedAt(contract.getCreatedAt())
                .contractStatus(contract.getStatus() != null ? contract.getStatus().name() : null)
                .milestoneId(milestone.getMilestoneId())
                .milestoneOrderIndex(milestone.getOrderIndex())
                .milestoneName(milestone.getName())
                .milestoneDescription(milestone.getDescription())
                .milestoneType(milestone.getMilestoneType() != null ? milestone.getMilestoneType().name() : null)
                .plannedStartAt(milestone.getPlannedStartAt())
                .plannedDueDate(milestone.getPlannedDueDate())
                .targetDeadline(targetDeadline)
                .estimatedDeadline(estimatedDeadline)
                .actualStartAt(milestone.getActualStartAt())
                .actualEndAt(milestone.getActualEndAt())
                .firstSubmissionAt(milestone.getFirstSubmissionAt())
                .finalCompletedAt(milestone.getFinalCompletedAt())
                .milestoneSlaDays(milestone.getMilestoneSlaDays())
                .firstSubmissionLate(
                    (milestone.getFirstSubmissionAt() != null && targetDeadline != null)
                        ? milestone.getFirstSubmissionAt().isAfter(targetDeadline)
                        : null
                )
                .overdueNow(
                    targetDeadline != null
                        ? (milestone.getFirstSubmissionAt() == null && now.isAfter(targetDeadline))
                        : null
                )
                .milestoneWorkStatus(milestone.getWorkStatus() != null ? milestone.getWorkStatus().name() : null)
                .assignmentId(assignment != null ? assignment.getAssignmentId() : null)
                .taskType(assignment != null ? assignment.getTaskType() : null)
                .assignmentStatus(assignment != null && assignment.getStatus() != null
                    ? assignment.getStatus().name()
                    : (isUnassigned ? "unassigned" : null))
                .specialistId(assignment != null ? assignment.getSpecialistId() : null)
                .specialistName(assignment != null ? assignment.getSpecialistNameSnapshot() : null)
                .assignedDate(assignment != null ? assignment.getAssignedDate() : null)
                .hasIssue(assignment != null ? assignment.getHasIssue() : null)
                .canAssign(isUnassigned)
                .studioBookingId(assignment != null ? assignment.getStudioBookingId() : null)
                .allArrangementsCompleted(allArrangementsCompleted)
                .build();
            long buildEnd = System.currentTimeMillis();
            timeBuilding += (buildEnd - buildStart);
            builtCount++;

            slots.add(slot);
        }
        log.info("[Performance] Step 5 - Build slots: {}ms (built {} slots from {} milestones)", 
            System.currentTimeMillis() - step5Start, slots.size(), milestones.size());
        log.info("[Performance] Step 5.1 - Filtering: {}ms ({} items)", timeFiltering, filteredCount);
        log.info("[Performance] Step 5.2 - Target deadline calculation: {}ms ({} items, avg: {}ms/item)", 
            timeTargetDeadline, targetDeadlineCount, targetDeadlineCount > 0 ? timeTargetDeadline / targetDeadlineCount : 0);
        log.info("[Performance] Step 5.3 - Building response objects: {}ms ({} items, avg: {}ms/item)", 
            timeBuilding, builtCount, builtCount > 0 ? timeBuilding / builtCount : 0);

        // Tạo map contractNumber -> contractCreatedAt để sort contracts theo thời gian tạo
        // Đảm bảo cùng contractNumber có cùng contractCreatedAt
        Map<String, LocalDateTime> contractCreatedAtMap = slots.stream()
            .filter(slot -> slot.getContractNumber() != null)
            .collect(Collectors.toMap(
                MilestoneAssignmentSlotResponse::getContractNumber,
                slot -> Optional.ofNullable(slot.getContractCreatedAt()).orElse(LocalDateTime.MIN),
                (existing, replacement) -> existing // Nếu trùng contractNumber, giữ giá trị đầu tiên
            ));
        
        // Sort: 
        // 1. Theo contractCreatedAt DESC (contract mới nhất lên trước) - dùng map để đảm bảo cùng contractNumber có cùng value
        // 2. Theo contractNumber để group cùng contract lại (secondary sort)
        // 3. Theo milestoneOrderIndex trong cùng contract
        long step6Start = System.currentTimeMillis();
        slots.sort(Comparator
            .comparing((MilestoneAssignmentSlotResponse slot) -> 
                contractCreatedAtMap.getOrDefault(
                    slot.getContractNumber(), 
                    Optional.ofNullable(slot.getContractCreatedAt()).orElse(LocalDateTime.MIN)
                ),
                Comparator.reverseOrder()) // DESC: contract mới nhất lên trước (primary sort)
            .thenComparing((MilestoneAssignmentSlotResponse slot) -> 
                Optional.ofNullable(slot.getContractNumber()).orElse("")) // Group cùng contract lại (secondary sort)
            .thenComparing((MilestoneAssignmentSlotResponse slot) -> 
                Optional.ofNullable(slot.getMilestoneOrderIndex()).orElse(999))
            .thenComparing((MilestoneAssignmentSlotResponse slot) -> 
                Optional.ofNullable(slot.getPlannedDueDate())
                    .orElseGet(() -> Optional.ofNullable(slot.getActualEndAt()).orElse(LocalDateTime.MAX))));
        log.info("[Performance] Step 6 - Sort slots: {}ms", System.currentTimeMillis() - step6Start);

        if (keyword != null && !keyword.isBlank()) {
            String lowerKeyword = keyword.toLowerCase();
            slots = slots.stream()
                .filter(slot ->
                    (slot.getContractNumber() != null
                        && slot.getContractNumber().toLowerCase().contains(lowerKeyword))
                        || (slot.getCustomerName() != null
                        && slot.getCustomerName().toLowerCase().contains(lowerKeyword))
                        || (slot.getMilestoneName() != null
                        && slot.getMilestoneName().toLowerCase().contains(lowerKeyword)))
                .collect(Collectors.toList());
        }

        long step7Start = System.currentTimeMillis();
        long totalUnassigned = slots.stream()
            .filter(slot -> slot.getAssignmentId() == null
                || slot.getAssignmentStatus() == null
                || "unassigned".equalsIgnoreCase(slot.getAssignmentStatus()))
            .count();
        long totalInProgress = slots.stream()
            .filter(slot -> "in_progress".equalsIgnoreCase(slot.getAssignmentStatus()))
            .count();
        long totalCompleted = slots.stream()
            .filter(slot -> "completed".equalsIgnoreCase(slot.getAssignmentStatus()))
            .count();
        log.info("[Performance] Step 7 - Calculate totals: {}ms (unassigned={}, inProgress={}, completed={})", 
            System.currentTimeMillis() - step7Start, totalUnassigned, totalInProgress, totalCompleted);

        long step8Start = System.currentTimeMillis();
        int totalElements = slots.size();
        int totalPages = (int) Math.ceil(totalElements / (double) safeSize);
        int fromIndex = Math.min(safePage * safeSize, totalElements);
        int toIndex = Math.min(fromIndex + safeSize, totalElements);
        List<MilestoneAssignmentSlotResponse> pageItems =
            fromIndex >= toIndex ? List.of() : slots.subList(fromIndex, toIndex);

        PageResponse<MilestoneAssignmentSlotResponse> pageResponse =
            PageResponse.<MilestoneAssignmentSlotResponse>builder()
                .content(pageItems)
                .pageNumber(safePage)
                .pageSize(safeSize)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .first(safePage == 0)
                .last(totalPages == 0 ? true : safePage >= totalPages - 1)
                .hasNext(totalPages == 0 ? false : safePage < totalPages - 1)
                .hasPrevious(safePage > 0)
                .build();
        log.info("[Performance] Step 8 - Paginate: {}ms (page={}, size={}, total={})", 
            System.currentTimeMillis() - step8Start, safePage, safeSize, totalElements);

        long totalTime = System.currentTimeMillis() - totalStart;
        log.info("[Performance] ===== getMilestoneAssignmentSlots COMPLETED in {}ms (TOTAL) =====", totalTime);

        return MilestoneAssignmentSlotsResult.builder()
            .page(pageResponse)
            .totalUnassigned(totalUnassigned)
            .totalInProgress(totalInProgress)
            .totalCompleted(totalCompleted)
            .build();
    }

    /**
     * Lấy danh sách tất cả task assignments với pagination và filters (cho manager)
     * Sử dụng JPA query với filters và pagination ở database level
     */
    public PageResponse<TaskAssignmentResponse> getAllTaskAssignments(
            String status,
            String taskType,
            String keyword,
            Integer minProgress,
            Integer maxProgress,
            int page,
            int size) {
        
        long totalStartTime = System.currentTimeMillis();
        log.info("[Performance] ===== getAllTaskAssignments STARTED - status={}, taskType={}, keyword={}, minProgress={}, maxProgress={}, page={}, size={} =====", 
            status, taskType, keyword, minProgress, maxProgress, page, size);

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 10 : size;

        long step1Start = System.currentTimeMillis();
        String managerUserId = getCurrentUserId();
        
        List<ContractStatus> allowedContractStatuses = List.of(
            ContractStatus.signed,
            ContractStatus.active_pending_assignment,
            ContractStatus.active,
            ContractStatus.completed
        );
        log.info("[Performance] Step 1 - Prepare managerUserId and contractStatuses: {}ms", 
            System.currentTimeMillis() - step1Start);

        // Parse filters
        long step1_7Start = System.currentTimeMillis();
        AssignmentStatus statusEnum = null;
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            try {
                // Enum values are lowercase with underscores (e.g., accepted_waiting, in_progress)
                String statusLower = status.toLowerCase();
                statusEnum = AssignmentStatus.valueOf(statusLower);

                log.debug("Parsed status filter: {} -> {}", status, statusEnum);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter: {}, error: {}", status, e.getMessage());
            }
        }

        TaskType taskTypeEnum = null;
        if (taskType != null && !taskType.isBlank() && !"all".equalsIgnoreCase(taskType)) {
            try {
                // TaskType enum values are lowercase with underscores (transcription, arrangement, recording_supervision)
                String taskTypeLower = taskType.toLowerCase();
                taskTypeEnum = TaskType.valueOf(taskTypeLower);

                log.debug("Parsed taskType filter: {} -> {}", taskType, taskTypeEnum);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid taskType filter: {}, error: {}", taskType, e.getMessage());
            }
        }

        // Prepare keyword for search
        String searchKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        
        // Validate progress range
        Integer validMinProgress = (minProgress != null && minProgress >= 0 && minProgress <= 100) ? minProgress : null;
        Integer validMaxProgress = (maxProgress != null && maxProgress >= 0 && maxProgress <= 100) ? maxProgress : null;
        if (validMinProgress != null && validMaxProgress != null && validMinProgress > validMaxProgress) {
            log.warn("Invalid progress range: minProgress={} > maxProgress={}, ignoring progress filter", 
                validMinProgress, validMaxProgress);
            validMinProgress = null;
            validMaxProgress = null;
        }
        
        log.info("[Performance] Step 1.7 - Parse filters: {}ms", System.currentTimeMillis() - step1_7Start);

        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<TaskAssignment> pageResult;
        
        long step2Start = System.currentTimeMillis();
        if (searchKeyword != null && !searchKeyword.isBlank()) {
            // Use optimized query with JOIN for keyword search (including contractNumber)
            pageResult = taskAssignmentRepository.findAllByManagerWithFiltersAndKeywordOptimized(
                managerUserId,
                allowedContractStatuses,
                statusEnum, 
                taskTypeEnum, 
                searchKeyword,
                validMinProgress,
                validMaxProgress,
                pageable
            );
        } else {
            // Use optimized query with JOIN (no keyword, better performance)
            pageResult = taskAssignmentRepository.findAllByManagerWithFiltersOptimized(
                managerUserId,
                allowedContractStatuses,
                statusEnum, 
                taskTypeEnum,
                validMinProgress,
                validMaxProgress,
                pageable
            );
        }
        log.info("[Performance] Step 2 - Query task assignments (optimized with JOIN): {}ms (found {} assignments, total: {})", 
            System.currentTimeMillis() - step2Start, pageResult.getContent().size(), pageResult.getTotalElements());

        // Batch fetch milestones trước để tránh N+1 query problem
        List<TaskAssignment> assignments = pageResult.getContent();
        final List<ContractMilestone> milestones;
        long step3Start = System.currentTimeMillis();
        if (!assignments.isEmpty()) {
            // Tối ưu: Fetch milestones bằng milestoneIds thay vì contractIds (nhanh hơn nhiều)
            List<String> milestoneIds = assignments.stream()
                .map(TaskAssignment::getMilestoneId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
            
            // Fetch milestones by milestoneIds (1 query thay vì N queries, và nhanh hơn findByContractIdIn)
            if (!milestoneIds.isEmpty()) {
                milestones = contractMilestoneRepository.findByMilestoneIdIn(milestoneIds);
                log.info("[Performance] Step 3 - Fetch milestones: {}ms (fetched {} milestones from {} milestoneIds)", 
                    System.currentTimeMillis() - step3Start, milestones.size(), milestoneIds.size());
            } else {
                milestones = List.of();
                log.info("[Performance] Step 3 - Fetch milestones: {}ms (no milestoneIds)", 
                    System.currentTimeMillis() - step3Start);
            }
        } else {
            milestones = List.of();
            log.info("[Performance] Step 3 - Fetch milestones: {}ms (no assignments)", 
                System.currentTimeMillis() - step3Start);
        }


        long step4Start = System.currentTimeMillis();
        // Cache LocalDateTime.now() để tránh gọi nhiều lần trong loop
        final LocalDateTime now = LocalDateTime.now();
        List<TaskAssignmentResponse> enrichedAssignments = assignments.stream()
            .map(assignment -> enrichTaskAssignmentWithMilestones(assignment, milestones, now))
            .collect(Collectors.toList());
        log.info("[Performance] Step 4 - Enrich assignments: {}ms (enriched {} assignments)", 
            System.currentTimeMillis() - step4Start, enrichedAssignments.size());

        long step5Start = System.currentTimeMillis();
        List<String> assignmentIds = enrichedAssignments.stream()
            .map(TaskAssignmentResponse::getAssignmentId)
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        
        // Batch fetch chỉ pending_review submissions để set hasPendingReview flag
        Map<String, Boolean> hasPendingReviewMap = new HashMap<>();
        if (!assignmentIds.isEmpty()) {
            List<FileSubmission> pendingSubmissions = fileSubmissionRepository
                .findByAssignmentIdInAndStatus(assignmentIds, SubmissionStatus.pending_review);
            hasPendingReviewMap = pendingSubmissions.stream()
                .collect(Collectors.toMap(
                    FileSubmission::getAssignmentId,
                    s -> true,
                    (existing, replacement) -> true // Nếu có nhiều pending submissions, vẫn là true
                ));
        }
        
        // Set hasPendingReview cho mỗi assignment
        for (TaskAssignmentResponse response : enrichedAssignments) {
            if (response.getAssignmentId() != null) {
                response.setHasPendingReview(hasPendingReviewMap.getOrDefault(response.getAssignmentId(), false));
                response.setSubmissions(List.of());
            }
        }
        log.info("[Performance] Step 5 - Set hasPendingReview flag: {}ms (checked {} assignments)", 
            System.currentTimeMillis() - step5Start, assignmentIds.size());

        // Tối ưu: Sử dụng contract snapshots từ TaskAssignment thay vì fetch Contract
        // Chỉ fetch contracts nếu cần revisionDeadlineDays (có thể null trong snapshot)
        long step6Start = System.currentTimeMillis();
        Map<String, TaskAssignmentResponse.ContractInfo> contractsMap = new HashMap<>();
        for (TaskAssignment assignment : assignments) {
            if (assignment.getContractId() != null && !contractsMap.containsKey(assignment.getContractId())) {
                // Sử dụng snapshot từ TaskAssignment (không cần query DB)
                contractsMap.put(assignment.getContractId(),
                    TaskAssignmentResponse.ContractInfo.builder()
                        .contractId(assignment.getContractId())
                        .contractNumber(assignment.getContractNumberSnapshot())
                        .nameSnapshot(assignment.getContractNameSnapshot())
                        .revisionDeadlineDays(null) // Không có trong snapshot, có thể fetch sau nếu cần
                        .contractCreatedAt(assignment.getContractCreatedAtSnapshot())
                        .build());
            }
        }
        log.info("[Performance] Step 6 - Build contractsMap from snapshots: {}ms ({} contracts, NO DB QUERY)", 
            System.currentTimeMillis() - step6Start, contractsMap.size());

        // Attach contracts to responses (submissions đã được set trong Step 5)
        long step7Start = System.currentTimeMillis();
        for (TaskAssignmentResponse response : enrichedAssignments) {
            if (response.getContractId() != null) {
                response.setContract(contractsMap.get(response.getContractId()));
            }
        }
        log.info("[Performance] Step 7 - Attach contracts: {}ms", 
            System.currentTimeMillis() - step7Start);

        // Sort theo logic tương tự getMilestoneAssignmentSlots:
        // 1. Theo contractCreatedAt DESC (contract mới nhất lên trước)
        // 2. Theo contractNumber để group cùng contract lại
        // 3. Theo milestoneOrderIndex trong cùng contract
        long step8Start = System.currentTimeMillis();
        enrichedAssignments.sort(Comparator
            .comparing((TaskAssignmentResponse response) -> {
                if (response.getContract() != null && response.getContract().getContractCreatedAt() != null) {
                    return response.getContract().getContractCreatedAt();
                }
                return LocalDateTime.MIN;
            }, Comparator.reverseOrder()) // DESC: contract mới nhất lên trước (primary sort)
            .thenComparing((TaskAssignmentResponse response) -> {
                if (response.getContract() != null && response.getContract().getContractNumber() != null) {
                    return response.getContract().getContractNumber();
                }
                return "";
            }) // Group cùng contract lại (secondary sort)
            .thenComparing((TaskAssignmentResponse response) -> {
                if (response.getMilestone() != null && response.getMilestone().getOrderIndex() != null) {
                    return response.getMilestone().getOrderIndex();
                }
                return 999;
            })); // Sort theo milestoneOrderIndex trong cùng contract
        log.info("[Performance] Step 8 - Sort assignments: {}ms", 
            System.currentTimeMillis() - step8Start);
        
        long totalTime = System.currentTimeMillis() - totalStartTime;
        log.info("[Performance] ===== getAllTaskAssignments COMPLETED in {}ms (TOTAL) =====", totalTime);
        
        return PageResponse.<TaskAssignmentResponse>builder()
            .content(enrichedAssignments)
            .pageNumber(pageResult.getNumber())
            .pageSize(pageResult.getSize())
            .totalElements((int) pageResult.getTotalElements())
            .totalPages(pageResult.getTotalPages())
            .first(pageResult.isFirst())
            .last(pageResult.isLast())
            .hasNext(pageResult.hasNext())
            .hasPrevious(pageResult.hasPrevious())
            .build();
    }

    /**
     * Tính progress percentage dựa trên assignment status và submissions
     * Logic tương tự frontend để đảm bảo consistency
     */
    private Integer calculateProgressPercentage(TaskAssignment assignment, List<FileSubmission> submissions) {
        if (assignment == null) {
            return 0;
        }
        
        AssignmentStatus status = assignment.getStatus();
        if (status == null) {
            return 0;
        }
        
        // Status ban đầu - chưa bắt đầu
        if (status == AssignmentStatus.assigned || 
            status == AssignmentStatus.accepted_waiting || 
            status == AssignmentStatus.ready_to_start) {
            return 0;
        }
        
        // Task đã hủy
        if (status == AssignmentStatus.cancelled) {
            return 0;
        }
        
        // Task hoàn thành
        if (status == AssignmentStatus.completed) {
            return 100;
        }
        
        // ready_for_review: đã submit lại và chờ duyệt (sau khi revision)
        if (status == AssignmentStatus.ready_for_review) {
            boolean hasPendingReview = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.pending_review);
            return hasPendingReview ? 75 : 50;
        }
        
        // revision_requested: có submission rejected hoặc revision_requested
        if (status == AssignmentStatus.revision_requested) {
            boolean hasRejected = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.rejected);
            boolean hasRevisionRequested = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.revision_requested);
            return (hasRejected || hasRevisionRequested) ? 40 : 0;
        }
        
        // in_revision: đang chỉnh sửa lại
        if (status == AssignmentStatus.in_revision) {
            boolean hasPendingReview = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.pending_review);
            boolean hasDraft = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.draft);
            if (hasPendingReview) return 70;
            if (hasDraft) return 60;
            return 60;
        }
        
        // waiting_customer_review: đã giao cho customer, chờ review
        if (status == AssignmentStatus.waiting_customer_review) {
            return 90;
        }
        
        // in_progress: tính dựa trên submissions
        if (status == AssignmentStatus.in_progress) {
            if (submissions.isEmpty()) {
                return 25; // Chưa có submission nào
            }
            
            // Kiểm tra submission status cao nhất (theo thứ tự ưu tiên)
            boolean hasCustomerAccepted = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.customer_accepted);
            boolean hasApproved = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.approved);
            boolean hasPendingReview = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.pending_review);
            boolean hasRejected = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.rejected);
            boolean hasRevisionRequested = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.revision_requested);
            boolean hasCustomerRejected = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.customer_rejected);
            boolean hasDraft = submissions.stream()
                .anyMatch(s -> s.getStatus() == SubmissionStatus.draft);
            
            // Ưu tiên: customer_accepted > approved > pending_review > rejected/revision_requested > draft
            if (hasCustomerAccepted) return 95;
            if (hasApproved) return 75;
            if (hasPendingReview) return 50;
            if (hasCustomerRejected || hasRejected || hasRevisionRequested) return 40;
            if (hasDraft) return 30;
            
            return 30; // Có submission nhưng status không rõ
        }
        
        return 0;
    }
    
    /**
     * Update progress percentage cho task assignment dựa trên submissions hiện tại
     * Gọi method này khi submission được tạo/update
     */
    @Transactional
    public void updateProgressForAssignment(String assignmentId) {
        Optional<TaskAssignment> assignmentOpt = taskAssignmentRepository.findById(assignmentId);
        if (assignmentOpt.isEmpty()) {
            log.warn("Cannot update progress: assignment not found: {}", assignmentId);
            return;
        }
        
        TaskAssignment assignment = assignmentOpt.get();
        List<FileSubmission> submissions = fileSubmissionRepository.findByAssignmentId(assignmentId);
        Integer newProgress = calculateProgressPercentage(assignment, submissions);
        
        if (!Objects.equals(assignment.getProgressPercentage(), newProgress)) {
            assignment.setProgressPercentage(newProgress);
            taskAssignmentRepository.save(assignment);
            log.debug("Updated progress for assignment {}: {}%", assignmentId, newProgress);
        }
    }

    private TaskAssignment pickLatestAssignment(List<TaskAssignment> assignments) {
        if (assignments == null || assignments.isEmpty()) {
            return null;
        }
        return assignments.stream()
            .sorted(Comparator
                .comparing((TaskAssignment a) -> a.getStatus() == AssignmentStatus.cancelled)
                .thenComparing(TaskAssignment::getAssignedDate, Comparator.nullsLast(Comparator.reverseOrder())))
            .findFirst()
            .orElse(null);
    }

    private boolean matchesStatusFilter(ContractMilestone milestone, TaskAssignment assignment, String statusFilter) {
        // Nếu statusFilter là null, blank, hoặc "all" → lấy tất cả
        if (statusFilter == null || statusFilter.isBlank() || "all".equalsIgnoreCase(statusFilter)) {
            return true;
        }
        
        // Nếu filter là "unassigned" → chỉ lấy milestones chưa có assignment hoặc assignment bị cancelled
        if ("unassigned".equalsIgnoreCase(statusFilter)) {
            return assignment == null || assignment.getStatus() == AssignmentStatus.cancelled;
        }
        
        // Nếu filter là "assigned" → chỉ lấy milestones đã có assignment (không bị cancelled)
        if ("assigned".equalsIgnoreCase(statusFilter)) {
            return assignment != null && assignment.getStatus() != AssignmentStatus.cancelled;
        }
        
        // Check milestoneWorkStatus nếu milestone có
        if (milestone != null && milestone.getWorkStatus() != null) {
            String milestoneStatus = milestone.getWorkStatus().name();
            
            // Map các status từ frontend sang milestoneWorkStatus
            // "ready_to_start" → READY_TO_START
            if ("ready_to_start".equalsIgnoreCase(statusFilter)) {
                return "READY_TO_START".equalsIgnoreCase(milestoneStatus);
            }
            // "in_progress" → IN_PROGRESS
            if ("in_progress".equalsIgnoreCase(statusFilter)) {
                return "IN_PROGRESS".equalsIgnoreCase(milestoneStatus);
            }
            // "completed" → COMPLETED
            if ("completed".equalsIgnoreCase(statusFilter)) {
                return "COMPLETED".equalsIgnoreCase(milestoneStatus);
            }
            // "accepted_waiting" → có thể là TASK_ACCEPTED_WAITING_ACTIVATION, READY_TO_START hoặc IN_PROGRESS
            if ("accepted_waiting".equalsIgnoreCase(statusFilter)) {
                return "TASK_ACCEPTED_WAITING_ACTIVATION".equalsIgnoreCase(milestoneStatus)
                    || "READY_TO_START".equalsIgnoreCase(milestoneStatus) 
                    || "IN_PROGRESS".equalsIgnoreCase(milestoneStatus);
            }
            
            // Fallback: match trực tiếp với milestoneWorkStatus name
            return milestoneStatus.equalsIgnoreCase(statusFilter);
        }
        
        // Nếu không có milestoneWorkStatus, fallback về assignmentStatus (backward compatibility)
        if (assignment != null && assignment.getStatus() != null) {
            return assignment.getStatus().name().equalsIgnoreCase(statusFilter);
        }
        
        return false;
    }


    private void notifySpecialistTaskAssigned(TaskAssignment assignment, Contract contract, ContractMilestone milestone) {
        if (assignment.getSpecialistId() == null) {
            return;
        }

        String specialistUserId = assignment.getSpecialistUserIdSnapshot();
        if (specialistUserId == null || specialistUserId.isBlank()) {
            log.warn("Cannot enqueue assignment notification. specialistUserId missing for specialistId={}",
                    assignment.getSpecialistId());
            return;
        }

        enqueueTaskAssignmentAssignedEvent(assignment, contract, milestone, specialistUserId);
    }

    private void notifySpecialistTaskReadyToStart(TaskAssignment assignment, Contract contract, ContractMilestone milestone) {
        if (assignment.getSpecialistId() == null) {
            return;
        }

        String specialistUserId = assignment.getSpecialistUserIdSnapshot();
        if (specialistUserId == null || specialistUserId.isBlank()) {
            log.warn("Cannot enqueue task ready to start notification. specialistUserId missing for specialistId={}",
                    assignment.getSpecialistId());
            return;
        }

        enqueueTaskAssignmentReadyToStartEvent(assignment, contract, milestone, specialistUserId);
    }

    private void enqueueTaskAssignmentAssignedEvent(
            TaskAssignment assignment,
            Contract contract,
            ContractMilestone milestone,
            String specialistUserId) {

        String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
            ? contract.getContractNumber()
            : contract.getContractId();
        String milestoneLabel = milestone != null && milestone.getName() != null
            ? milestone.getName()
            : assignment.getMilestoneId();

        TaskAssignmentAssignedEvent event = TaskAssignmentAssignedEvent.builder()
            .eventId(UUID.randomUUID())
            .assignmentId(assignment.getAssignmentId())
            .contractId(contract.getContractId())
            .contractNumber(contractLabel)
            .specialistId(assignment.getSpecialistId())
            .specialistUserId(specialistUserId)
            .taskType(assignment.getTaskType() != null ? assignment.getTaskType().name() : null)
            .milestoneId(assignment.getMilestoneId())
            .milestoneName(milestoneLabel)
            .title("Bạn được giao task mới")
            .content(String.format(
                "Manager đã gán task %s cho contract #%s (Milestone: %s). Vui lòng kiểm tra mục My Tasks.",
                assignment.getTaskType(),
                contractLabel,
                milestoneLabel))
            .referenceType("TASK_ASSIGNMENT")
            .actionUrl(getTaskActionUrl(assignment.getTaskType()))
            .assignedAt(assignment.getAssignedDate())
            .timestamp(LocalDateTime.now())
            .build();

        try {
            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(assignment.getAssignmentId());
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }

            OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateId(aggregateId)
                .aggregateType("TaskAssignment")
                .eventType("task.assignment.assigned")
                .eventPayload(payload)
                .build();

            outboxEventRepository.save(outboxEvent);
            log.info("Queued TaskAssignmentAssignedEvent: assignmentId={}, userId={}",
                assignment.getAssignmentId(), specialistUserId);
        } catch (Exception ex) {
            log.error("Failed to enqueue TaskAssignmentAssignedEvent: assignmentId={}, error={}",
                assignment.getAssignmentId(), ex.getMessage(), ex);
        }
    }

    private void enqueueTaskAssignmentReadyToStartEvent(
            TaskAssignment assignment,
            Contract contract,
            ContractMilestone milestone,
            String specialistUserId) {

        String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
            ? contract.getContractNumber()
            : contract.getContractId();
        String milestoneLabel = milestone != null && milestone.getName() != null
            ? milestone.getName()
            : assignment.getMilestoneId();

        TaskAssignmentReadyToStartEvent event = TaskAssignmentReadyToStartEvent.builder()
            .eventId(UUID.randomUUID())
            .assignmentId(assignment.getAssignmentId())
            .contractId(contract.getContractId())
            .contractNumber(contractLabel)
            .specialistId(assignment.getSpecialistId())
            .specialistUserId(specialistUserId)
            .taskType(assignment.getTaskType() != null ? assignment.getTaskType().name() : null)
            .milestoneId(assignment.getMilestoneId())
            .milestoneName(milestoneLabel)
            .title("Task đã sẵn sàng để bắt đầu")
            .content(String.format(
                "Task %s cho contract #%s (Milestone: %s) đã sẵn sàng để bạn bắt đầu làm việc. Vui lòng kiểm tra mục My Tasks.",
                assignment.getTaskType(),
                contractLabel,
                milestoneLabel))
            .referenceType("TASK_ASSIGNMENT")
            .actionUrl(getTaskActionUrl(assignment.getTaskType()))
            .timestamp(LocalDateTime.now())
            .build();

        try {
            JsonNode payload = objectMapper.valueToTree(event);
            UUID aggregateId;
            try {
                aggregateId = UUID.fromString(assignment.getAssignmentId());
            } catch (IllegalArgumentException ex) {
                aggregateId = UUID.randomUUID();
            }

            OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateId(aggregateId)
                .aggregateType("TaskAssignment")
                .eventType("task.assignment.ready.to.start")
                .eventPayload(payload)
                .build();

            outboxEventRepository.save(outboxEvent);
            log.info("Queued TaskAssignmentReadyToStartEvent: assignmentId={}, userId={}",
                assignment.getAssignmentId(), specialistUserId);
        } catch (Exception ex) {
            log.error("Failed to enqueue TaskAssignmentReadyToStartEvent: assignmentId={}, error={}",
                assignment.getAssignmentId(), ex.getMessage(), ex);
        }
    }

    private Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String str) {
            try {
                return Integer.parseInt(str);
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private int countOpenTasksInSlaWindowForSpecialist(String specialistId, String contractId, String milestoneId) {
        if (specialistId == null || specialistId.isBlank()
            || contractId == null || contractId.isBlank()
            || milestoneId == null || milestoneId.isBlank()) {
            return 0;
        }

        LocalDateTime slaWindowStart = calculateSlaWindowStartInternal(contractId, milestoneId);
        LocalDateTime slaWindowEnd = calculateSlaWindowEndInternal(contractId, milestoneId);

        // Nếu không tính được window => coi như 0 (không block), consistent với getTaskStats()
        if (slaWindowStart == null || slaWindowEnd == null) {
            return 0;
        }

        List<TaskAssignment> tasks = taskAssignmentRepository.findBySpecialistId(specialistId);
        return (int) tasks.stream()
            .filter(task -> isOpenStatus(task.getStatus()))
            .map(this::resolveTaskDeadline)
            .filter(deadline -> deadline != null
                && !deadline.isBefore(slaWindowStart)
                && !deadline.isAfter(slaWindowEnd))
            .count();
    }

    private void enforceSlaWindowCapacity(
            String specialistId,
            Integer maxConcurrentTasks,
            String contractId,
            String milestoneId) {
        int max = maxConcurrentTasks != null && maxConcurrentTasks > 0 ? maxConcurrentTasks : 1;
        int tasksInWindow = countOpenTasksInSlaWindowForSpecialist(specialistId, contractId, milestoneId);
        if (tasksInWindow >= max) {
            throw SpecialistSlaWindowFullException.create(
                specialistId, tasksInWindow, max, contractId, milestoneId);
        }
    }

    /**
     * Lấy chi tiết task assignment
     */
    public TaskAssignmentResponse getTaskAssignmentById(String contractId, String assignmentId) {
        log.info("Getting task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        TaskAssignment assignment = taskAssignmentRepository
            .findByContractIdAndAssignmentId(contractId, assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        return enrichTaskAssignment(assignment);
    }

    /**
     * Tạo task assignment mới
     */
    @Transactional
    public TaskAssignmentResponse createTaskAssignment(
            String contractId, CreateTaskAssignmentRequest request) {
        log.info("Creating task assignment: contractId={}, specialistId={}, taskType={}", 
            contractId, request.getSpecialistId(), request.getTaskType());
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Verify contract is active (only active contracts can have task assignments)
        // Cho phép tạo task khi contract đang active hoặc active_pending_assignment
        if (contract.getStatus() != ContractStatus.active
            && contract.getStatus() != ContractStatus.active_pending_assignment) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId, 
                contract.getStatus(),
                "Cannot create task assignment: Contract is not active. Current status: " + contract.getStatus()
            );
        }
        
        // Milestone is mandatory and must exist
        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(request.getMilestoneId(), contractId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(request.getMilestoneId(), contractId));
        
        // Dùng taskType từ request (frontend đã set từ milestone.milestoneType)
        TaskType taskType = request.getTaskType();
        if (taskType == null) {
            throw InvalidTaskTypeException.create(
                null, 
                "Task type is required. Frontend should set taskType from milestone.milestoneType."
            );
        }
        
        // Verify task type matches contract type
        if (!isTaskTypeValidForContract(taskType, contract.getContractType())) {
            throw InvalidTaskTypeException.create(taskType, contract.getContractType().toString());
        }
        
        // Verify task type matches milestone type (milestoneType luôn được set)
        // QUAN TRỌNG: Milestone nào → Task nấy (không trộn)
        // - Milestone TRANSCRIPTION → Task type: TRANSCRIPTION
        // - Milestone ARRANGEMENT → Task type: ARRANGEMENT
        // - Milestone RECORDING → Task type: RECORDING_SUPERVISION
        // Mỗi milestone có task riêng, không reuse task từ milestone khác
        if (milestone.getMilestoneType() == null) {
            throw InvalidTaskTypeException.create(
                taskType, 
                String.format("Milestone '%s' (ID: %s) does not have milestoneType. All milestones must have milestoneType set.", 
                    milestone.getName(), milestone.getMilestoneId())
            );
        }
        
        // Với recording milestone, chỉ accept RECORDING_SUPERVISION
        if (milestone.getMilestoneType() == MilestoneType.recording) {
            if (taskType != TaskType.recording_supervision) {
                throw InvalidTaskTypeException.create(
                    taskType, 
                    String.format("Recording milestone must have task type RECORDING_SUPERVISION. Got: %s. " +
                        "Each milestone has its own task - cannot reuse tasks from other milestones.", 
                        taskType)
                );
            }
        } else {
            // Với các milestone khác, task type phải match chính xác
            TaskType expectedTaskType = switch (milestone.getMilestoneType()) {
                case transcription -> TaskType.transcription;
                case arrangement -> TaskType.arrangement;
                case recording -> null; // Đã xử lý ở trên
            };
            if (expectedTaskType != null && taskType != expectedTaskType) {
                throw InvalidTaskTypeException.create(
                    taskType, 
                    String.format("Task type must match milestone type. Expected: %s, Got: %s. " +
                        "Each milestone has its own task - cannot reuse tasks from other milestones.", 
                        expectedTaskType, taskType)
                );
            }
        }
        
        // Verify milestone work status allows task assignment creation
        // Chỉ cho phép tạo task khi milestone ở WAITING_ASSIGNMENT/PLANNED/READY_TO_START/IN_PROGRESS
        MilestoneWorkStatus workStatus = milestone.getWorkStatus();
        if (workStatus != MilestoneWorkStatus.WAITING_ASSIGNMENT
            && workStatus != MilestoneWorkStatus.PLANNED 
            && workStatus != MilestoneWorkStatus.READY_TO_START
            && workStatus != MilestoneWorkStatus.IN_PROGRESS) {
            throw InvalidMilestoneWorkStatusException.cannotCreateTask(
                request.getMilestoneId(), 
                workStatus
            );
        }
        
        // Update milestone status: WAITING_ASSIGNMENT → WAITING_SPECIALIST_ACCEPT
        if (workStatus == MilestoneWorkStatus.WAITING_ASSIGNMENT) {
            milestone.setWorkStatus(MilestoneWorkStatus.WAITING_SPECIALIST_ACCEPT);
            contractMilestoneRepository.save(milestone);
            log.info("Milestone status updated to WAITING_SPECIALIST_ACCEPT: contractId={}, milestoneId={}",
                contractId, request.getMilestoneId());
        }

        // Ensure milestone does not already have an active task
        boolean hasActiveTask = taskAssignmentRepository
            .findByContractIdAndMilestoneId(contractId, request.getMilestoneId())
            .stream()
            .anyMatch(task -> task.getStatus() != AssignmentStatus.cancelled
                && isOpenStatus(task.getStatus()));
        if (hasActiveTask) {
            throw TaskAssignmentAlreadyActiveException.forMilestone(request.getMilestoneId());
        }
        
        Map<String, Object> specialistData;
        try {
            ApiResponse<Map<String, Object>> specialistResponse =
                specialistServiceFeignClient.getSpecialistById(request.getSpecialistId());
            if (specialistResponse == null
                || !"success".equalsIgnoreCase(specialistResponse.getStatus())
                || specialistResponse.getData() == null) {
                throw SpecialistNotFoundException.byId(request.getSpecialistId());
            }
            specialistData = specialistResponse.getData();
        } catch (SpecialistNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to fetch specialist info for ID {}: {}", request.getSpecialistId(), ex.getMessage());
            throw FailedToFetchSpecialistException.create(request.getSpecialistId(), ex.getMessage(), ex);
        }

        // Enforce backend rule: SLA window full => không cho assign
        Integer maxConcurrentTasks = asInteger(specialistData.get("maxConcurrentTasks"));
        enforceSlaWindowCapacity(request.getSpecialistId(), maxConcurrentTasks, contractId, request.getMilestoneId());
        
        // Với recording_supervision task, tự động tìm và link studio booking (nếu đã có)
        String studioBookingId = null;
        
        if (taskType == TaskType.recording_supervision) {
            // Tìm studio booking cho milestone này (nếu đã có)
            Optional<StudioBooking> bookingOpt = 
                studioBookingRepository.findByMilestoneId(request.getMilestoneId());
            
            // Nếu không tìm thấy theo milestoneId, tìm theo contractId với context PRE_CONTRACT_HOLD
            // (booking có thể chưa được link với milestone khi assign task)
            if (bookingOpt.isEmpty()) {
                List<StudioBooking> bookings = studioBookingRepository.findByContractId(contractId);
                bookingOpt = bookings.stream()
                    .filter(b -> b.getContext() == StudioBookingContext.PRE_CONTRACT_HOLD 
                        && b.getMilestoneId() == null)
                    .findFirst();
                
                // Nếu tìm thấy, link booking với milestone
                if (bookingOpt.isPresent()) {
                    StudioBooking booking = bookingOpt.get();
                    booking.setMilestoneId(request.getMilestoneId());
                    studioBookingRepository.save(booking);
                    log.info("Linked booking to milestone: bookingId={}, milestoneId={}", 
                        booking.getBookingId(), request.getMilestoneId());
                }
            }
            
            if (bookingOpt.isPresent()) {
                studioBookingId = bookingOpt.get().getBookingId();
                log.info("Found existing studio booking for recording milestone: bookingId={}, milestoneId={}", 
                    studioBookingId, request.getMilestoneId());
            }
        }
        
        // Create task assignment
        TaskAssignment assignment = TaskAssignment.builder()
            .contractId(contractId)
            // Populate contract snapshots để tránh fetch Contract trong list view
            .contractNumberSnapshot(contract.getContractNumber())
            .contractNameSnapshot(contract.getNameSnapshot())
            .contractCreatedAtSnapshot(contract.getCreatedAt())
            .specialistId(request.getSpecialistId())
            .specialistNameSnapshot(asString(specialistData.get("fullName")))
            .specialistEmailSnapshot(asString(specialistData.get("email")))
            .specialistSpecializationSnapshot(asString(specialistData.get("specialization")))
            .specialistExperienceYearsSnapshot(asInteger(specialistData.get("experienceYears")))
            .specialistUserIdSnapshot(asString(specialistData.get("userId")))
            .taskType(taskType)
            .status(AssignmentStatus.assigned)
            .milestoneId(request.getMilestoneId())
            .notes(request.getNotes())
            .assignedDate(LocalDateTime.now())
            .studioBookingId(studioBookingId)  // Có thể null nếu chưa có booking
            .progressPercentage(0)  // Initial progress = 0%
            .build();
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment created successfully: assignmentId={}, studioBookingId={}", 
            saved.getAssignmentId(), saved.getStudioBookingId());
        
        notifySpecialistTaskAssigned(saved, contract, milestone);
        
        return enrichTaskAssignment(saved);
    }

    /**
     * Cập nhật task assignment
     */
    @Transactional
    public TaskAssignmentResponse updateTaskAssignment(
            String contractId, String assignmentId, UpdateTaskAssignmentRequest request) {
        log.info("Updating task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Find task assignment
        TaskAssignment assignment = taskAssignmentRepository
            .findByContractIdAndAssignmentId(contractId, assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Don't allow update if already completed
        if (assignment.getStatus() == AssignmentStatus.completed) {
            throw TaskAssignmentAlreadyCompletedException.cannotUpdate(assignmentId);
        }
        
        // Update fields
        if (request.getSpecialistId() != null) {
            String newSpecialistId = request.getSpecialistId();
            Map<String, Object> specialistData;
            try {
                ApiResponse<Map<String, Object>> specialistResponse =
                    specialistServiceFeignClient.getSpecialistById(newSpecialistId);
                if (specialistResponse == null
                    || !"success".equalsIgnoreCase(specialistResponse.getStatus())
                    || specialistResponse.getData() == null) {
                    throw SpecialistNotFoundException.byId(newSpecialistId);
                }
                specialistData = specialistResponse.getData();
            } catch (SpecialistNotFoundException ex) {
                throw ex;
            } catch (Exception ex) {
                log.error("Failed to fetch specialist info for ID {}: {}", newSpecialistId, ex.getMessage());
                throw FailedToFetchSpecialistException.create(newSpecialistId, ex.getMessage(), ex);
            }

            // Enforce backend rule only when changing specialist
            if (!newSpecialistId.equals(assignment.getSpecialistId())) {
                String milestoneIdForCheck = request.getMilestoneId() != null && !request.getMilestoneId().isBlank()
                    ? request.getMilestoneId()
                    : assignment.getMilestoneId();
                Integer maxConcurrentTasks = asInteger(specialistData.get("maxConcurrentTasks"));
                enforceSlaWindowCapacity(newSpecialistId, maxConcurrentTasks, contractId, milestoneIdForCheck);
            }

            assignment.setSpecialistId(newSpecialistId);
            assignment.setSpecialistNameSnapshot(asString(specialistData.get("fullName")));
            assignment.setSpecialistEmailSnapshot(asString(specialistData.get("email")));
            assignment.setSpecialistSpecializationSnapshot(asString(specialistData.get("specialization")));
            assignment.setSpecialistExperienceYearsSnapshot(asInteger(specialistData.get("experienceYears")));
            assignment.setSpecialistUserIdSnapshot(asString(specialistData.get("userId")));
        }
        if (request.getTaskType() != null) {
            assignment.setTaskType(request.getTaskType());
        }
        if (request.getMilestoneId() != null) {
            if (request.getMilestoneId().isBlank()) {
                throw InvalidMilestoneIdException.cannotBeBlank();
            }
            contractMilestoneRepository
                .findByMilestoneIdAndContractId(request.getMilestoneId(), contractId)
                .orElseThrow(() -> ContractMilestoneNotFoundException.byId(request.getMilestoneId(), contractId));
            assignment.setMilestoneId(request.getMilestoneId());
        }
        if (request.getNotes() != null) {
            assignment.setNotes(request.getNotes());
        }
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment updated successfully: assignmentId={}", saved.getAssignmentId());
        
        return enrichTaskAssignment(saved);
    }

    /**
     * Xóa task assignment
     */
    @Transactional
    public void deleteTaskAssignment(String contractId, String assignmentId) {
        log.info("Deleting task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
        // Verify contract exists
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        
        // Verify user has permission
        verifyManagerPermission(contract);
        
        // Find task assignment
        TaskAssignment assignment = taskAssignmentRepository
            .findByContractIdAndAssignmentId(contractId, assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Don't allow delete if already completed
        if (assignment.getStatus() == AssignmentStatus.completed) {
            throw TaskAssignmentAlreadyCompletedException.cannotDelete(assignmentId);
        }
        
        taskAssignmentRepository.delete(assignment);
        log.info("Task assignment deleted successfully: assignmentId={}", assignmentId);
    }

    /**
     * Verify user is manager of the contract
     */
    private void verifyManagerPermission(Contract contract) {
        String currentUserId = getCurrentUserId();
        if (!contract.getManagerUserId().equals(currentUserId)) {
            throw UnauthorizedException.create(
                "Only the contract manager can manage task assignments");
        }
    }

    /**
     * Check if task type is valid for contract type
     */
    private boolean isTaskTypeValidForContract(TaskType taskType, 
            ContractType contractType) {
        return switch (contractType) {
            case transcription -> taskType == TaskType.transcription;
            case arrangement -> taskType == TaskType.arrangement;
            case recording -> 
                taskType == TaskType.recording_supervision;
            case arrangement_with_recording -> 
                taskType == TaskType.arrangement 
                || taskType == TaskType.recording_supervision;
            case bundle -> 
                taskType == TaskType.transcription 
                || taskType == TaskType.arrangement 
                || taskType == TaskType.recording_supervision;
        };
    }


    /**
     * Get actionUrl based on taskType for notification routing
     */
    private String getTaskActionUrl(TaskType taskType) {
        if (taskType == null) {
            return "/transcription/my-tasks"; // default
        }
        return switch (taskType) {
            case transcription -> "/transcription/my-tasks";
            case arrangement -> "/arrangement/my-tasks";
            case recording_supervision -> "/recording-artist/my-tasks";
        };
    }

    /**
     * Lấy danh sách task assignments của specialist hiện tại
     */
    public List<TaskAssignmentResponse> getMyTaskAssignments() {
        log.info("Getting task assignments for current specialist");
        String specialistId = getCurrentSpecialistId();
        List<TaskAssignment> assignments = taskAssignmentRepository.findBySpecialistId(specialistId);
        return assignments.stream()
            .map(this::enrichTaskAssignment)
            .toList();
    }

    /**
     * Lấy chi tiết task assignment của specialist hiện tại (với request info)
     */
    public TaskAssignmentResponse getMyTaskAssignmentById(String assignmentId) {
        log.info("Getting task assignment detail with request info: assignmentId={}", assignmentId);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only view your own task assignments");
        }
        
        // Map task assignment to response & enrich
        TaskAssignmentResponse response = enrichTaskAssignment(assignment);
        
        // Fetch request info từ contract (chỉ cần requestId, không cần fetch toàn bộ contract)
        try {
            String requestId = contractRepository.findRequestIdByContractId(assignment.getContractId()).orElse(null);
            if (requestId != null) {
                try {
                    // Gọi request-service để lấy request details (đầy đủ thông tin)
                    ApiResponse<ServiceRequestInfoResponse> requestResponse = 
                        requestServiceFeignClient.getServiceRequestById(requestId);
                    if (requestResponse != null && "success".equals(requestResponse.getStatus()) 
                        && requestResponse.getData() != null) {
                        ServiceRequestInfoResponse requestData = requestResponse.getData();
                        
                        // Convert durationMinutes sang seconds
                        Integer durationSeconds = null;
                        if (requestData.getDurationMinutes() != null) {
                            try {
                                double minutes = requestData.getDurationMinutes().doubleValue();
                                durationSeconds = (int) Math.round(minutes * 60);
                            } catch (Exception ex) {
                                log.warn("Failed to convert durationMinutes to seconds: {}", ex.getMessage());
                            }
                        }
                        
                        // Extract tempo từ tempoPercentage
                        Integer tempo = null;
                        if (requestData.getTempoPercentage() != null) {
                            try {
                                tempo = requestData.getTempoPercentage().intValue();
                            } catch (Exception ex) {
                                log.warn("Failed to extract tempo: {}", ex.getMessage());
                            }
                        }
                        
                        // Map request info (đầy đủ thông tin cho specialist)
                        TaskAssignmentResponse.RequestInfo requestInfo = TaskAssignmentResponse.RequestInfo.builder()
                            .requestId(requestData.getRequestId())
                            .serviceType(requestData.getRequestType())
                            .title(requestData.getTitle())
                            .description(requestData.getDescription())
                            .durationSeconds(durationSeconds)
                            .tempo(tempo)
                            .instruments(requestData.getInstruments()) // List instruments nếu có
                            .files(requestData.getFiles()) // List files mà customer đã upload
                            .build();
                        response.setRequest(requestInfo);
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch request info: requestId={}, error={}", 
                        requestId, e.getMessage());
                    // Không fail nếu không load được request
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch requestId from contract: contractId={}, error={}", 
                assignment.getContractId(), e.getMessage());
            // Không fail nếu không load được requestId
        }
        
        return response;
    }

    /**
     * Specialist accept task (assigned → in_progress)
     */
    @Transactional
    public TaskAssignmentResponse acceptTaskAssignment(String assignmentId) {
        log.info("Specialist accepting task assignment: assignmentId={}", assignmentId);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only accept tasks assigned to you");
        }
        
        // Only allow accept if status is 'assigned'
        if (assignment.getStatus() != AssignmentStatus.assigned) {
            throw InvalidTaskAssignmentStatusException.cannotAccept(assignment.getAssignmentId(), assignment.getStatus());
        }
        
        assignment.setSpecialistRespondedAt(LocalDateTime.now());
        assignment.setSpecialistResponseReason(null);

        ContractMilestone milestone = contractMilestoneRepository.findByMilestoneIdAndContractId(
            assignment.getMilestoneId(), assignment.getContractId()
        ).orElseThrow(() -> ContractMilestoneNotFoundException.byId(
            assignment.getMilestoneId(), assignment.getContractId()));

        // Với recording task, tự động link studioBookingId nếu booking đã được tạo trước đó
        if (assignment.getTaskType() == TaskType.recording_supervision 
            && milestone.getMilestoneType() == MilestoneType.recording
            && (assignment.getStudioBookingId() == null || assignment.getStudioBookingId().isEmpty())) {
            Optional<StudioBooking> bookingOpt = studioBookingRepository.findByMilestoneId(milestone.getMilestoneId());
            if (bookingOpt.isPresent()) {
                assignment.setStudioBookingId(bookingOpt.get().getBookingId());
                log.info("Auto-linked studio booking to recording task on accept: taskId={}, bookingId={}, milestoneId={}",
                    assignment.getAssignmentId(), bookingOpt.get().getBookingId(), milestone.getMilestoneId());
            }
        }

        // Specialist accept task → task status = ACCEPTED_WAITING
        // Milestone chuyển từ WAITING_SPECIALIST_ACCEPT → TASK_ACCEPTED_WAITING_ACTIVATION
        if (milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_SPECIALIST_ACCEPT) {
            assignment.setStatus(AssignmentStatus.accepted_waiting);
            // Milestone chuyển sang TASK_ACCEPTED_WAITING_ACTIVATION (đã accept, chờ activate)
            milestone.setWorkStatus(MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
            contractMilestoneRepository.save(milestone);
            log.info("Task assignment accepted (waiting for milestone activation): assignmentId={}, milestoneId={}, milestoneStatus={}", 
                assignmentId, milestone.getMilestoneId(), MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
        } else if (milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_ASSIGNMENT) {
            // Trường hợp milestone vẫn ở WAITING_ASSIGNMENT (có thể do race condition hoặc milestone chưa được update)
            assignment.setStatus(AssignmentStatus.accepted_waiting);
            // Milestone chuyển sang TASK_ACCEPTED_WAITING_ACTIVATION (đã accept, chờ activate)
            milestone.setWorkStatus(MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
            contractMilestoneRepository.save(milestone);
            log.info("Task assignment accepted (milestone was WAITING_ASSIGNMENT, now TASK_ACCEPTED_WAITING_ACTIVATION): assignmentId={}, milestoneId={}, milestoneStatus={}", 
                assignmentId, milestone.getMilestoneId(), MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
        } else if (milestone.getWorkStatus() == MilestoneWorkStatus.PLANNED) {
            assignment.setStatus(AssignmentStatus.accepted_waiting);
            // Milestone ở PLANNED → chuyển TASK_ACCEPTED_WAITING_ACTIVATION (đã accept, chờ activate)
            milestone.setWorkStatus(MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
            contractMilestoneRepository.save(milestone);
            log.info("Task assignment accepted (waiting for milestone activation): assignmentId={}, milestoneId={}, milestoneStatus={}", 
                assignmentId, milestone.getMilestoneId(), MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION);
        } else if (milestone.getWorkStatus() == MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION) {
            // Milestone đã có task accepted, accept task mới → vẫn giữ TASK_ACCEPTED_WAITING_ACTIVATION
            assignment.setStatus(AssignmentStatus.accepted_waiting);
            log.info("Task assignment accepted (milestone already has accepted task): assignmentId={}, milestoneId={}", 
                assignmentId, milestone.getMilestoneId());
        } else if (milestone.getWorkStatus() == MilestoneWorkStatus.READY_TO_START) {
            assignment.setStatus(AssignmentStatus.ready_to_start);
            log.info("Task assignment accepted and READY_TO_START: assignmentId={}", assignmentId);
        } else if (milestone.getWorkStatus() == MilestoneWorkStatus.IN_PROGRESS) {
            assignment.setStatus(AssignmentStatus.in_progress);
            log.info("Task assignment accepted and immediately IN_PROGRESS: assignmentId={}", assignmentId);
        } else {
            throw InvalidMilestoneWorkStatusException.cannotCreateTask(
                milestone.getMilestoneId(), milestone.getWorkStatus());
        }
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);

        if (saved.getStatus() == AssignmentStatus.in_progress) {
            milestoneProgressService.evaluateActualStart(
                assignment.getContractId(),
                assignment.getMilestoneId()
            );
        }
        
        // Với recording milestone, nếu milestone đã ở TASK_ACCEPTED_WAITING_ACTIVATION và task đã có booking,
        // tự động activate milestone để chuyển sang READY_TO_START
        if (milestone.getMilestoneType() == MilestoneType.recording 
            && milestone.getWorkStatus() == MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION
            && saved.getTaskType() == TaskType.recording_supervision
            && saved.getStudioBookingId() != null && !saved.getStudioBookingId().isEmpty()) {
            try {
                activateAssignmentsForMilestone(assignment.getContractId(), milestone.getMilestoneId());
                log.info("Auto-activated recording milestone after task accepted with booking: milestoneId={}, taskId={}, bookingId={}",
                    milestone.getMilestoneId(), saved.getAssignmentId(), saved.getStudioBookingId());
            } catch (Exception e) {
                log.warn("Failed to auto-activate milestone after task accepted: milestoneId={}, taskId={}, error={}",
                    milestone.getMilestoneId(), saved.getAssignmentId(), e.getMessage());
                // Không throw error, chỉ log warning (milestone sẽ được activate sau)
            }
        }
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Specialist chính thức bắt đầu làm việc (READY_TO_START → IN_PROGRESS)
     */
    @Transactional
    public TaskAssignmentResponse startTaskAssignment(String assignmentId) {
        log.info("Specialist starting task assignment: assignmentId={}", assignmentId);

        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));

        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only start tasks assigned to you");
        }

        if (assignment.getStatus() != AssignmentStatus.ready_to_start) {
            throw InvalidTaskAssignmentStatusException.cannotStart(assignment.getAssignmentId(), assignment.getStatus());
        }

        // Fetch milestone để validate và update
        ContractMilestone milestone = contractMilestoneRepository.findByMilestoneIdAndContractId(
            assignment.getMilestoneId(), assignment.getContractId()
        ).orElse(null);

        // Với recording_supervision task, bắt buộc phải có studio booking trước khi start work
        if (assignment.getTaskType() == TaskType.recording_supervision 
            && milestone != null 
            && milestone.getMilestoneType() == MilestoneType.recording) {
            if (assignment.getStudioBookingId() == null || assignment.getStudioBookingId().isEmpty()) {
                throw InvalidStateException.missingStudioBookingForRecordingTask(
                    assignment.getAssignmentId(), assignment.getMilestoneId());
            }
            log.info("Recording supervision task has studio booking linked before start: taskId={}, bookingId={}", 
                assignment.getAssignmentId(), assignment.getStudioBookingId());
        }

        // Update task: ready_to_start → in_progress
        assignment.setStatus(AssignmentStatus.in_progress);
        assignment.setSpecialistRespondedAt(LocalDateTime.now());
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment moved to IN_PROGRESS: assignmentId={}", assignmentId);

        // Update milestone: READY_TO_START → IN_PROGRESS
        
        if (milestone != null && milestone.getWorkStatus() == MilestoneWorkStatus.READY_TO_START) {
            milestone.setWorkStatus(MilestoneWorkStatus.IN_PROGRESS);
            contractMilestoneRepository.save(milestone);
            log.info("Milestone status updated to IN_PROGRESS: contractId={}, milestoneId={}",
                assignment.getContractId(), assignment.getMilestoneId());
        }

        milestoneProgressService.evaluateActualStart(
            assignment.getContractId(),
            assignment.getMilestoneId()
        );

        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Specialist cancel task (assigned → cancelled)
     */
    @Transactional
    public TaskAssignmentResponse cancelTaskAssignment(String assignmentId, String reason) {
        log.info("Specialist cancelling task assignment: assignmentId={}, reason={}", assignmentId, reason);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only cancel tasks assigned to you");
        }
        
        // Only allow cancel if task chưa bắt đầu thực tế
        if (assignment.getStatus() != AssignmentStatus.assigned
            && assignment.getStatus() != AssignmentStatus.accepted_waiting
            && assignment.getStatus() != AssignmentStatus.ready_to_start) {
            throw InvalidTaskAssignmentStatusException.cannotCancel(assignment.getAssignmentId(), assignment.getStatus());
        }
        
        assignment.setStatus(AssignmentStatus.cancelled);
        assignment.setSpecialistResponseReason(reason);
        assignment.setSpecialistRespondedAt(LocalDateTime.now());
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment cancelled successfully: assignmentId={}, reason={}", assignmentId, reason);
        
        // Update milestone status nếu không còn task active
        ContractMilestone milestone = contractMilestoneRepository.findByMilestoneIdAndContractId(
            assignment.getMilestoneId(), assignment.getContractId()
        ).orElse(null);
        
        if (milestone != null) {
            // Kiểm tra xem milestone còn task active không (không cancelled)
            List<TaskAssignment> activeTasks = taskAssignmentRepository
                .findByContractIdAndMilestoneId(assignment.getContractId(), assignment.getMilestoneId())
                .stream()
                .filter(task -> task.getStatus() != AssignmentStatus.cancelled
                    && isOpenStatus(task.getStatus()))
                .toList();
            
            // Nếu không còn task active và milestone đang ở WAITING_SPECIALIST_ACCEPT hoặc TASK_ACCEPTED_WAITING_ACTIVATION
            // → rollback về WAITING_ASSIGNMENT
            if (activeTasks.isEmpty() 
                && (milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_SPECIALIST_ACCEPT
                    || milestone.getWorkStatus() == MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION)) {
                milestone.setWorkStatus(MilestoneWorkStatus.WAITING_ASSIGNMENT);
                contractMilestoneRepository.save(milestone);
                log.info("Milestone status rolled back to WAITING_ASSIGNMENT after task cancellation: contractId={}, milestoneId={}",
                    assignment.getContractId(), assignment.getMilestoneId());
            }
        }
        
        // Gửi notification cho manager qua Kafka
        try {
            Contract contract = contractRepository.findById(assignment.getContractId())
                .orElse(null);
            
            if (contract != null && contract.getManagerUserId() != null) {
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : assignment.getContractId();
                
                // Dùng lại milestone đã fetch ở trên (dòng 1906)
                String milestoneName = milestone != null && milestone.getName() != null && !milestone.getName().isBlank()
                    ? milestone.getName()
                    : "Milestone " + (milestone != null && milestone.getOrderIndex() != null ? milestone.getOrderIndex() : "");
                
                TaskAssignmentCanceledEvent event = TaskAssignmentCanceledEvent.builder()
                        .eventId(UUID.randomUUID())
                        .assignmentId(assignmentId)
                        .contractId(assignment.getContractId())
                        .contractNumber(contractLabel)
                        .userId(contract.getManagerUserId())
                        .specialistId(assignment.getSpecialistId())
                        .specialistUserId(assignment.getSpecialistUserIdSnapshot())
                        .taskType(assignment.getTaskType() != null ? assignment.getTaskType().toString() : "")
                        .milestoneId(assignment.getMilestoneId())
                        .milestoneName(milestoneName)
                        .reason(reason)
                        .canceledBy("SPECIALIST")
                        .title("Task assignment đã bị hủy")
                        .content(String.format("Specialist đã hủy task assignment cho contract #%s. Task type: %s. Lý do: %s", 
                                contractLabel,
                                assignment.getTaskType(),
                                reason))
                        .referenceType("TASK_ASSIGNMENT")
                        .actionUrl("/manager/milestone-assignments?contractId=" + assignment.getContractId())
                        .canceledAt(LocalDateTime.now())
                        .timestamp(LocalDateTime.now())
                        .build();
                
                publishToOutbox(event, assignmentId, "TaskAssignment", "task.assignment.canceled");
                log.info("Queued TaskAssignmentCanceledEvent in outbox: eventId={}, assignmentId={}, managerUserId={}", 
                        event.getEventId(), assignmentId, contract.getManagerUserId());
            } else {
                log.warn("Cannot send notification: contract not found or managerUserId is null. contractId={}, assignmentId={}", 
                        assignment.getContractId(), assignmentId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue task cancellation notification: assignmentId={}, error={}", 
                    assignmentId, e.getMessage(), e);
        }
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Specialist báo issue (không kịp deadline, có vấn đề)
     * Task vẫn giữ nguyên status IN_PROGRESS, chỉ đánh dấu hasIssue = true
     */
    @Transactional
    public TaskAssignmentResponse reportIssue(String assignmentId, String reason) {
        log.info("Specialist reporting issue: assignmentId={}, reason={}", assignmentId, reason);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify task belongs to current specialist
        String specialistId = getCurrentSpecialistId();
        if (!assignment.getSpecialistId().equals(specialistId)) {
            throw UnauthorizedException.create(
                "You can only report issues for your own tasks");
        }
        
        // Only allow report issue if status is 'in_progress'
        if (assignment.getStatus() != AssignmentStatus.in_progress) {
            throw InvalidTaskAssignmentStatusException.cannotReportIssue(assignment.getAssignmentId(), assignment.getStatus());
        }
        
        // Set issue flag và thông tin
        assignment.setHasIssue(true);
        assignment.setIssueReason(reason);
        assignment.setIssueReportedAt(LocalDateTime.now());
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Issue reported successfully: assignmentId={}", assignmentId);
        
        // Gửi notification cho manager qua Kafka
        try {
            Contract contract = contractRepository.findById(assignment.getContractId())
                .orElse(null);
            
            if (contract != null && contract.getManagerUserId() != null) {
                String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                    ? contract.getContractNumber()
                    : assignment.getContractId();
                
                ContractMilestone milestone = contractMilestoneRepository.findById(assignment.getMilestoneId())
                    .orElse(null);
                String milestoneName = milestone != null && milestone.getName() != null && !milestone.getName().isBlank()
                    ? milestone.getName()
                    : "Milestone " + (milestone != null && milestone.getOrderIndex() != null ? milestone.getOrderIndex() : "");
                
                TaskIssueReportedEvent event = TaskIssueReportedEvent.builder()
                        .eventId(UUID.randomUUID())
                        .assignmentId(assignmentId)
                        .contractId(assignment.getContractId())
                        .contractNumber(contractLabel)
                        .managerUserId(contract.getManagerUserId())
                        .specialistId(assignment.getSpecialistId())
                        .specialistUserId(assignment.getSpecialistUserIdSnapshot())
                        .taskType(assignment.getTaskType() != null ? assignment.getTaskType().toString() : "")
                        .milestoneId(assignment.getMilestoneId())
                        .milestoneName(milestoneName)
                        .reason(reason)
                        .title("Task có vấn đề / không kịp deadline")
                        .content(String.format("Specialist đã báo issue cho task assignment của contract #%s. Task type: %s. Lý do: %s. Vui lòng kiểm tra và xử lý.", 
                                contractLabel,
                                assignment.getTaskType(),
                                reason))
                        .referenceType("TASK_ASSIGNMENT")
                        .actionUrl("/manager/milestone-assignments?contractId=" + assignment.getContractId())
                        .reportedAt(LocalDateTime.now())
                        .timestamp(LocalDateTime.now())
                        .build();
                
                publishToOutbox(event, assignmentId, "TaskAssignment", "task.issue.reported");
                log.info("Queued TaskIssueReportedEvent in outbox: eventId={}, assignmentId={}, managerUserId={}", 
                        event.getEventId(), assignmentId, contract.getManagerUserId());
            } else {
                log.warn("Cannot send notification: contract not found or managerUserId is null. contractId={}, assignmentId={}", 
                        assignment.getContractId(), assignmentId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to enqueue issue report notification: assignmentId={}, error={}", 
                    assignmentId, e.getMessage(), e);
        }
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Manager resolve issue (clear hasIssue flag - cho specialist tiếp tục)
     */
    @Transactional
    public TaskAssignmentResponse resolveIssue(String contractId, String assignmentId) {
        log.info("Manager resolving issue: contractId={}, assignmentId={}", contractId, assignmentId);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify contract exists and user has permission
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        verifyManagerPermission(contract);
        
        // Verify assignment belongs to contract
        if (!assignment.getContractId().equals(contractId)) {
            throw TaskAssignmentNotBelongToContractException.create(assignment.getAssignmentId(), contractId);
        }
        
        // Only allow resolve if task has issue
        if (!Boolean.TRUE.equals(assignment.getHasIssue())) {
            throw TaskAssignmentNoIssueException.create(assignment.getAssignmentId());
        }
        
        // Clear issue flag
        assignment.setHasIssue(false);
        assignment.setIssueReason(null);
        assignment.setIssueReportedAt(null);
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Issue resolved successfully: assignmentId={}, contractId={}", assignmentId, contractId);
        
        return taskAssignmentMapper.toResponse(saved);
    }

    /**
     * Manager cancel task (có thể cancel task ở bất kỳ status nào, trừ completed)
     * Giữ lại thông tin issue report (issueReason, issueReportedAt) để lưu lịch sử
     */
    @Transactional
    public TaskAssignmentResponse cancelTaskByManager(String contractId, String assignmentId) {
        log.info("Manager cancelling task assignment: contractId={}, assignmentId={}", 
            contractId, assignmentId);
        
        TaskAssignment assignment = taskAssignmentRepository.findById(assignmentId)
            .orElseThrow(() -> TaskAssignmentNotFoundException.byId(assignmentId));
        
        // Verify contract exists and user has permission
        Contract contract = contractRepository.findById(contractId)
            .orElseThrow(() -> ContractNotFoundException.byId(contractId));
        verifyManagerPermission(contract);
        
        // Verify assignment belongs to contract
        if (!assignment.getContractId().equals(contractId)) {
            throw TaskAssignmentNotBelongToContractException.create(assignment.getAssignmentId(), contractId);
        }
        
        // Don't allow cancel if already completed
        if (assignment.getStatus() == AssignmentStatus.completed) {
            throw new TaskAssignmentAlreadyCompletedException(assignment.getAssignmentId());
        }
        
        // Don't allow cancel if already cancelled
        if (assignment.getStatus() == AssignmentStatus.cancelled) {
            throw InvalidTaskAssignmentStatusException.cannotCancel(assignment.getAssignmentId(), assignment.getStatus());
        }
        
        // Set status to cancelled
        assignment.setStatus(AssignmentStatus.cancelled);
        assignment.setSpecialistRespondedAt(LocalDateTime.now());
        // Giữ lại thông tin issue report (issueReason, issueReportedAt) để lưu lịch sử
        // Chỉ clear hasIssue flag vì task đã bị cancel
        assignment.setHasIssue(false);
        // Không clear issueReason và issueReportedAt - giữ lại để biết lý do báo issue
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment cancelled by manager successfully: assignmentId={}, contractId={}, hadIssue={}", 
            assignmentId, contractId, saved.getIssueReason() != null);
        
        // Update milestone status nếu không còn task active
        ContractMilestone milestone = contractMilestoneRepository.findByMilestoneIdAndContractId(
            assignment.getMilestoneId(), contractId
        ).orElse(null);
        
        if (milestone != null) {
            // Kiểm tra xem milestone còn task active không (không cancelled)
            List<TaskAssignment> activeTasks = taskAssignmentRepository
                .findByContractIdAndMilestoneId(contractId, assignment.getMilestoneId())
                .stream()
                .filter(task -> task.getStatus() != AssignmentStatus.cancelled
                    && isOpenStatus(task.getStatus()))
                .toList();
            
            // Nếu không còn task active và milestone đang ở WAITING_SPECIALIST_ACCEPT hoặc TASK_ACCEPTED_WAITING_ACTIVATION
            // → rollback về WAITING_ASSIGNMENT
            if (activeTasks.isEmpty() 
                && (milestone.getWorkStatus() == MilestoneWorkStatus.WAITING_SPECIALIST_ACCEPT
                    || milestone.getWorkStatus() == MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION)) {
                milestone.setWorkStatus(MilestoneWorkStatus.WAITING_ASSIGNMENT);
                contractMilestoneRepository.save(milestone);
                log.info("Milestone status rolled back to WAITING_ASSIGNMENT after manager cancellation: contractId={}, milestoneId={}",
                    contractId, assignment.getMilestoneId());
            }
        }
        
        // Gửi notification cho specialist qua Kafka
        try {
            if (assignment.getSpecialistId() != null) {
                String specialistUserId = assignment.getSpecialistUserIdSnapshot();
                if (specialistUserId != null && !specialistUserId.isBlank()) {
                    String issueInfo = "";
                    if (saved.getIssueReason() != null) {
                        issueInfo = String.format(" (Bạn đã báo issue: %s)", saved.getIssueReason());
                    }
                    
                    String contractLabel = contract.getContractNumber() != null && !contract.getContractNumber().isBlank()
                        ? contract.getContractNumber()
                        : contractId;
                    
                    String milestoneName = milestone != null && milestone.getName() != null && !milestone.getName().isBlank()
                        ? milestone.getName()
                        : "Milestone " + (milestone != null && milestone.getOrderIndex() != null ? milestone.getOrderIndex() : "");
                    
                    TaskAssignmentCanceledEvent event = TaskAssignmentCanceledEvent.builder()
                            .eventId(UUID.randomUUID())
                            .assignmentId(assignmentId)
                            .contractId(contractId)
                            .contractNumber(contractLabel)
                            .userId(specialistUserId)
                            .specialistId(assignment.getSpecialistId())
                            .specialistUserId(specialistUserId)
                            .taskType(assignment.getTaskType() != null ? assignment.getTaskType().toString() : "")
                            .milestoneId(assignment.getMilestoneId())
                            .milestoneName(milestoneName)
                            .reason(saved.getIssueReason())
                            .canceledBy("MANAGER")
                            .title("Task đã bị hủy bởi Manager")
                            .content(String.format("Manager đã hủy task %s cho contract #%s.%s Task sẽ được gán lại cho specialist khác.", 
                                    assignment.getTaskType(),
                                    contractLabel,
                                    issueInfo))
                            .referenceType("TASK_ASSIGNMENT")
                            .actionUrl(getTaskActionUrl(assignment.getTaskType()))
                            .canceledAt(LocalDateTime.now())
                            .timestamp(LocalDateTime.now())
                            .build();
                    
                    publishToOutbox(event, assignmentId, "TaskAssignment", "task.assignment.canceled");
                    log.info("Queued TaskAssignmentCanceledEvent in outbox: eventId={}, assignmentId={}, specialistUserId={}", 
                            event.getEventId(), assignmentId, specialistUserId);
                } else {
                    log.warn("Specialist userId not available for specialistId={}, assignmentId={}", 
                        assignment.getSpecialistId(), assignmentId);
                }
            }
        } catch (Exception e) {
            log.error("Failed to enqueue cancellation notification to specialist: assignmentId={}, error={}", 
                assignmentId, e.getMessage(), e);
        }
        
        return taskAssignmentMapper.toResponse(saved);
    }

    @Transactional
    public void activateAssignmentsForMilestone(String contractId, String milestoneId) {
        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElse(null);
        
        if (milestone == null) {
            log.warn("Milestone not found: contractId={}, milestoneId={}", contractId, milestoneId);
            return;
        }
        
        // Chỉ activate khi milestone ở TASK_ACCEPTED_WAITING_ACTIVATION và có task đã accepted
        if (milestone.getWorkStatus() != MilestoneWorkStatus.TASK_ACCEPTED_WAITING_ACTIVATION) {
            log.debug("Milestone not in TASK_ACCEPTED_WAITING_ACTIVATION status, skipping activation: contractId={}, milestoneId={}, status={}",
                contractId, milestoneId, milestone.getWorkStatus());
            return;
        }
        
        List<TaskAssignment> assignments = taskAssignmentRepository
            .findByContractIdAndMilestoneId(contractId, milestoneId);

        // Tìm task đã accepted (accepted_waiting)
        List<TaskAssignment> acceptedTasks = assignments.stream()
            .filter(task -> task.getStatus() == AssignmentStatus.accepted_waiting)
            .toList();
        
        if (acceptedTasks.isEmpty()) {
            log.debug("No accepted tasks found for milestone, cannot activate: contractId={}, milestoneId={}",
                contractId, milestoneId);
            return;
        }
        
        // Với recording milestone, bắt buộc phải có studio booking trước khi activate
        if (milestone.getMilestoneType() == MilestoneType.recording) {
            for (TaskAssignment task : acceptedTasks) {
                if (task.getTaskType() == TaskType.recording_supervision) {
                    if (task.getStudioBookingId() == null || task.getStudioBookingId().isEmpty()) {
                        throw InvalidStateException.missingStudioBookingForRecordingMilestone(
                            milestoneId, task.getAssignmentId());
                    }
                    log.info("Recording task has studio booking linked: taskId={}, bookingId={}", 
                        task.getAssignmentId(), task.getStudioBookingId());
                }
            }
        }
        
        // Update milestone: TASK_ACCEPTED_WAITING_ACTIVATION → READY_TO_START
        milestone.setWorkStatus(MilestoneWorkStatus.READY_TO_START);
        contractMilestoneRepository.save(milestone);
        log.info("Milestone status updated to READY_TO_START: contractId={}, milestoneId={}", contractId, milestoneId);
        
        // Update tasks: accepted_waiting → ready_to_start
        List<TaskAssignment> toUpdate = acceptedTasks.stream()
            .peek(task -> task.setStatus(AssignmentStatus.ready_to_start))
            .toList();

        if (!toUpdate.isEmpty()) {
            taskAssignmentRepository.saveAll(toUpdate);
            log.info("Activated {} assignments for milestone ready_to_start: contractId={}, milestoneId={}",
                toUpdate.size(), contractId, milestoneId);
            
            // Gửi notification cho từng specialist khi task được activate
            Contract contract = contractRepository.findById(contractId).orElse(null);
            
            if (contract != null) {
                for (TaskAssignment assignment : toUpdate) {
                    notifySpecialistTaskReadyToStart(assignment, contract, milestone);
                }
            }
        }
    }

    /**
     * Lấy specialistId của user hiện tại từ specialist-service
     */
    private String getCurrentSpecialistId() {
        try {
            ApiResponse<Map<String, Object>> response = specialistServiceFeignClient.getMySpecialistInfo();
            if (response == null || !"success".equals(response.getStatus()) 
                || response.getData() == null) {
                throw UnauthorizedException.create("Specialist not found for current user");
            }
            Map<String, Object> data = response.getData();
            String specialistId = (String) data.get("specialistId");
            if (specialistId == null || specialistId.isEmpty()) {
                throw UnauthorizedException.create("Specialist ID not found in response");
            }
            return specialistId;
        } catch (Exception e) {
            log.error("Failed to get specialist info: {}", e.getMessage(), e);
            throw UnauthorizedException.create("Failed to get specialist information: " + e.getMessage());
        }
    }

    /**
     * Lấy current user ID từ JWT token
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            log.error("userId claim not found in JWT - this should not happen!");
            throw UserNotAuthenticatedException.create();
        }
        throw UserNotAuthenticatedException.create();
    }
}

