package com.mutrapro.project_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.project_service.client.NotificationServiceFeignClient;
import com.mutrapro.project_service.client.RequestServiceFeignClient;
import com.mutrapro.project_service.client.SpecialistServiceFeignClient;
import com.mutrapro.project_service.dto.request.CreateNotificationRequest;
import com.mutrapro.project_service.dto.request.CreateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.request.UpdateTaskAssignmentRequest;
import com.mutrapro.project_service.dto.response.ServiceRequestInfoResponse;
import com.mutrapro.shared.dto.PageResponse;
import com.mutrapro.project_service.dto.response.MilestoneAssignmentSlotsResult;
import com.mutrapro.project_service.dto.response.MilestoneAssignmentSlotResponse;
import com.mutrapro.project_service.dto.response.TaskAssignmentResponse;
import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.entity.OutboxEvent;
import com.mutrapro.project_service.entity.TaskAssignment;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.SpecialistTaskStats;
import com.mutrapro.shared.dto.TaskStatsRequest;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.ContractType;
import com.mutrapro.project_service.enums.TaskType;
import com.mutrapro.shared.enums.NotificationType;
import com.mutrapro.shared.event.TaskAssignmentAssignedEvent;
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
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.OutboxEventRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import java.time.Instant;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    NotificationServiceFeignClient notificationServiceFeignClient;
    RequestServiceFeignClient requestServiceFeignClient;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;
    MilestoneProgressService milestoneProgressService;

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
     */
    public Map<String, SpecialistTaskStats> getTaskStats(TaskStatsRequest request) {
        if (request == null || request.getSpecialistIds() == null || request.getSpecialistIds().isEmpty()) {
            return new HashMap<>();
        }

        List<String> specialistIds = request.getSpecialistIds().stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(id -> !id.isEmpty())
            .distinct()
            .toList();

        if (specialistIds.isEmpty()) {
            return new HashMap<>();
        }

        LocalDateTime slaWindowEnd = calculateSlaWindowEndInternal(request.getContractId(), request.getMilestoneId());
        List<TaskAssignment> assignments = taskAssignmentRepository.findBySpecialistIdIn(specialistIds);

        Map<String, List<TaskAssignment>> assignmentsBySpecialist = assignments.stream()
            .collect(Collectors.groupingBy(TaskAssignment::getSpecialistId));

        Map<String, SpecialistTaskStats> result = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        assignmentsBySpecialist.forEach((specialistId, tasks) -> {
            int totalOpenTasks = (int) tasks.stream()
                .filter(task -> isOpenStatus(task.getStatus()))
                .count();

            int tasksInSlaWindow = 0;
            if (slaWindowEnd != null) {
                tasksInSlaWindow = (int) tasks.stream()
                    .filter(task -> isOpenStatus(task.getStatus()))
                    .map(this::resolveTaskDeadline)
                    .filter(deadline -> deadline != null
                        && !deadline.isBefore(now)
                        && !deadline.isAfter(slaWindowEnd))
                    .count();
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

        return result;
    }

    private boolean isOpenStatus(AssignmentStatus status) {
        return status == AssignmentStatus.assigned || status == AssignmentStatus.in_progress;
    }

    private LocalDateTime resolveTaskDeadline(TaskAssignment assignment) {
        if (assignment.getMilestoneId() == null || assignment.getContractId() == null) {
            return null;
        }

        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(assignment.getMilestoneId(), assignment.getContractId())
            .orElse(null);

        return resolveMilestoneDeadline(milestone);
    }

    private LocalDateTime calculateSlaWindowEndInternal(String contractId, String milestoneId) {
        if (contractId == null || contractId.isBlank() || milestoneId == null || milestoneId.isBlank()) {
            return null;
        }

        return contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .map(this::resolveMilestoneDeadlineWithFallback)
            .orElse(null);
    }

    private LocalDateTime resolveMilestoneDeadlineWithFallback(ContractMilestone milestone) {
        LocalDateTime deadline = resolveMilestoneDeadline(milestone);
        if (deadline != null) {
            return deadline;
        }
        Integer slaDays = milestone != null ? milestone.getMilestoneSlaDays() : null;
        if (slaDays != null && slaDays > 0) {
            return LocalDateTime.now().plusDays(slaDays);
        }
        return null;
    }

    private LocalDateTime resolveMilestoneDeadline(ContractMilestone milestone) {
        if (milestone == null) {
            return null;
        }
        Integer slaDays = milestone.getMilestoneSlaDays();
        if (milestone.getActualStartAt() != null && slaDays != null && slaDays > 0) {
            return milestone.getActualStartAt().plusDays(slaDays);
        }
        if (milestone.getActualEndAt() != null) {
            return milestone.getActualEndAt();
        }
        if (milestone.getPlannedDueDate() != null) {
            return milestone.getPlannedDueDate();
        }
        if (milestone.getPlannedStartAt() != null && slaDays != null && slaDays > 0) {
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
            TaskAssignmentResponse.MilestoneInfo milestoneInfo = TaskAssignmentResponse.MilestoneInfo.builder()
                .milestoneId(milestone.getMilestoneId())
                .name(milestone.getName())
                .description(milestone.getDescription())
                .plannedStartAt(milestone.getPlannedStartAt())
                .plannedDueDate(milestone.getPlannedDueDate())
                .actualStartAt(milestone.getActualStartAt())
                .actualEndAt(milestone.getActualEndAt())
                .milestoneSlaDays(milestone.getMilestoneSlaDays())
                .build();
            response.setMilestone(milestoneInfo);
        }
        
        // KHÔNG enrich specialist info (tránh circular dependency với specialist-service)
        
        return response;
    }

    /**
     * Enrich TaskAssignmentResponse với milestone info
     */
    private TaskAssignmentResponse enrichTaskAssignment(TaskAssignment assignment) {
        TaskAssignmentResponse response = taskAssignmentMapper.toResponse(assignment);
        enrichMilestoneInfo(response, assignment.getMilestoneId(), assignment.getContractId());
        return response;
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
                TaskAssignmentResponse.MilestoneInfo milestoneInfo = TaskAssignmentResponse.MilestoneInfo.builder()
                    .milestoneId(milestone.getMilestoneId())
                    .name(milestone.getName())
                    .description(milestone.getDescription())
                    .plannedStartAt(milestone.getPlannedStartAt())
                    .plannedDueDate(milestone.getPlannedDueDate())
                .actualStartAt(milestone.getActualStartAt())
                .actualEndAt(milestone.getActualEndAt())
                    .milestoneSlaDays(milestone.getMilestoneSlaDays())
                    .build();
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
            String taskType,
            String keyword,
            Boolean onlyUnassigned,
            int page,
            int size) {

        int safePage = Math.max(page, 0);
        int safeSize = size <= 0 ? 10 : size;

        String managerUserId = getCurrentUserId();
        List<Contract> contracts;

        if (contractId != null && !contractId.isBlank()) {
            Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> ContractNotFoundException.byId(contractId));
            verifyManagerPermission(contract);
            contracts = List.of(contract);
        } else {
            contracts = contractRepository.findByManagerUserId(managerUserId);
        }

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

        List<ContractMilestone> milestones = contractMilestoneRepository.findByContractIdIn(contractIds);
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

        List<TaskAssignment> assignments = taskAssignmentRepository.findByMilestoneIdIn(milestoneIds);
        Map<String, TaskAssignment> assignmentMap = assignments.stream()
            .collect(Collectors.groupingBy(TaskAssignment::getMilestoneId,
                Collectors.collectingAndThen(Collectors.toList(), this::pickLatestAssignment)));

        List<MilestoneAssignmentSlotResponse> slots = new ArrayList<>();

        for (ContractMilestone milestone : milestones) {
            Contract contract = contractMap.get(milestone.getContractId());
            if (contract == null) {
                continue;
            }

            TaskAssignment assignment = assignmentMap.get(milestone.getMilestoneId());
            boolean isUnassigned = assignment == null || assignment.getStatus() == AssignmentStatus.cancelled;

            if (Boolean.TRUE.equals(onlyUnassigned) && !isUnassigned) {
                continue;
            }
            if (!matchesStatusFilter(assignment, status)) {
                continue;
            }
            if (!matchesTaskTypeFilter(assignment, taskType)) {
                continue;
            }

            MilestoneAssignmentSlotResponse slot = MilestoneAssignmentSlotResponse.builder()
                .contractId(contract.getContractId())
                .contractNumber(contract.getContractNumber())
                .contractType(contract.getContractType() != null ? contract.getContractType().name() : null)
                .customerName(contract.getNameSnapshot())
                .milestoneId(milestone.getMilestoneId())
                .milestoneOrderIndex(milestone.getOrderIndex())
                .milestoneName(milestone.getName())
                .milestoneDescription(milestone.getDescription())
                .plannedStartAt(milestone.getPlannedStartAt())
                .plannedDueDate(milestone.getPlannedDueDate())
                .actualStartAt(milestone.getActualStartAt())
                .actualEndAt(milestone.getActualEndAt())
                .milestoneSlaDays(milestone.getMilestoneSlaDays())
                .assignmentId(assignment != null ? assignment.getAssignmentId() : null)
                .taskType(assignment != null ? assignment.getTaskType() : null)
                .assignmentStatus(assignment != null && assignment.getStatus() != null
                    ? assignment.getStatus().name()
                    : (isUnassigned ? "unassigned" : null))
                .specialistId(assignment != null ? assignment.getSpecialistId() : null)
                .assignedDate(assignment != null ? assignment.getAssignedDate() : null)
                .hasIssue(assignment != null ? assignment.getHasIssue() : null)
                .canAssign(isUnassigned)
                .build();

            slots.add(slot);
        }

        slots.sort(Comparator.comparing(
            slot -> Optional.ofNullable(slot.getPlannedDueDate())
                .orElseGet(() -> Optional.ofNullable(slot.getActualEndAt()).orElse(LocalDateTime.MAX))));

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

        return MilestoneAssignmentSlotsResult.builder()
            .page(pageResponse)
            .totalUnassigned(totalUnassigned)
            .totalInProgress(totalInProgress)
            .totalCompleted(totalCompleted)
            .build();
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

    private boolean matchesStatusFilter(TaskAssignment assignment, String statusFilter) {
        if (statusFilter == null || statusFilter.isBlank() || "all".equalsIgnoreCase(statusFilter)) {
            return true;
        }
        if ("unassigned".equalsIgnoreCase(statusFilter)) {
            return assignment == null || assignment.getStatus() == AssignmentStatus.cancelled;
        }
        if (assignment == null || assignment.getStatus() == null) {
            return false;
        }
        return assignment.getStatus().name().equalsIgnoreCase(statusFilter);
    }

    private boolean matchesTaskTypeFilter(TaskAssignment assignment, String taskTypeFilter) {
        if (taskTypeFilter == null || taskTypeFilter.isBlank() || "all".equalsIgnoreCase(taskTypeFilter)) {
            return true;
        }
        if (assignment == null || assignment.getTaskType() == null) {
            return false;
        }
        return assignment.getTaskType().name().equalsIgnoreCase(taskTypeFilter);
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
            .actionUrl("/transcription/my-tasks")
            .assignedAt(assignment.getAssignedDate())
            .timestamp(Instant.now())
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
        if (contract.getStatus() != ContractStatus.active) {
            throw InvalidContractStatusException.cannotUpdate(
                contractId, 
                contract.getStatus(),
                "Cannot create task assignment: Contract is not active. Current status: " + contract.getStatus()
            );
        }
        
        // Verify task type matches contract type
        TaskType taskType = request.getTaskType();
        if (!isTaskTypeValidForContract(taskType, contract.getContractType())) {
            throw InvalidTaskTypeException.create(taskType, contract.getContractType().toString());
        }
        
        // Milestone is mandatory and must exist
        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(request.getMilestoneId(), contractId)
            .orElseThrow(() -> ContractMilestoneNotFoundException.byId(request.getMilestoneId(), contractId));
        
        // Verify milestone work status allows task assignment creation
        // Only PLANNED and IN_PROGRESS milestones can have tasks assigned
        MilestoneWorkStatus workStatus = milestone.getWorkStatus();
        if (workStatus != MilestoneWorkStatus.PLANNED 
            && workStatus != MilestoneWorkStatus.IN_PROGRESS) {
            throw InvalidMilestoneWorkStatusException.cannotCreateTask(
                request.getMilestoneId(), 
                workStatus
            );
        }

        // Ensure milestone does not already have an active task
        boolean hasActiveTask = taskAssignmentRepository
            .findByContractIdAndMilestoneId(contractId, request.getMilestoneId())
            .stream()
            .anyMatch(task -> task.getStatus() == AssignmentStatus.assigned
                || task.getStatus() == AssignmentStatus.in_progress);
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
                throw new RuntimeException("Specialist not found: " + request.getSpecialistId());
            }
            specialistData = specialistResponse.getData();
        } catch (Exception ex) {
            log.error("Failed to fetch specialist info for ID {}: {}", request.getSpecialistId(), ex.getMessage());
            throw new RuntimeException("Failed to fetch specialist info: " + ex.getMessage(), ex);
        }
        
        // Create task assignment
        TaskAssignment assignment = TaskAssignment.builder()
            .contractId(contractId)
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
            .assignedDate(java.time.Instant.now())
            .usedRevisions(0)
            .build();
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment created successfully: assignmentId={}", saved.getAssignmentId());
        
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
            assignment.setSpecialistId(request.getSpecialistId());
            Map<String, Object> specialistData;
            try {
                ApiResponse<Map<String, Object>> specialistResponse =
                    specialistServiceFeignClient.getSpecialistById(request.getSpecialistId());
                if (specialistResponse == null
                    || !"success".equalsIgnoreCase(specialistResponse.getStatus())
                    || specialistResponse.getData() == null) {
                    throw new RuntimeException("Specialist not found: " + request.getSpecialistId());
                }
                specialistData = specialistResponse.getData();
            } catch (Exception ex) {
                log.error("Failed to fetch specialist info for ID {}: {}", request.getSpecialistId(), ex.getMessage());
                throw new RuntimeException("Failed to fetch specialist info: " + ex.getMessage(), ex);
            }
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
            case recording -> taskType == TaskType.recording;
            case arrangement_with_recording -> 
                taskType == TaskType.arrangement || taskType == TaskType.recording;
            case bundle -> 
                taskType == TaskType.transcription 
                || taskType == TaskType.arrangement 
                || taskType == TaskType.recording;
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
                        
                        // Extract timeSignature và specialNotes từ musicOptions
                        String timeSignature = null;
                        String specialNotes = null;
                        if (requestData.getMusicOptions() != null) {
                            try {
                                Map<String, Object> musicOptions = requestData.getMusicOptions();
                                if (musicOptions.get("timeSignature") != null) {
                                    timeSignature = musicOptions.get("timeSignature").toString();
                                }
                                if (musicOptions.get("specialNotes") != null) {
                                    specialNotes = musicOptions.get("specialNotes").toString();
                                }
                            } catch (Exception ex) {
                                log.warn("Failed to extract musicOptions: {}", ex.getMessage());
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
                            .timeSignature(timeSignature)
                            .specialNotes(specialNotes)
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
            throw new RuntimeException(
                "Task assignment cannot be accepted. Current status: " + assignment.getStatus());
        }
        
        assignment.setStatus(AssignmentStatus.in_progress);
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment accepted successfully: assignmentId={}", assignmentId);

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
        
        // Only allow cancel if status is 'assigned'
        if (assignment.getStatus() != AssignmentStatus.assigned) {
            throw new RuntimeException(
                "Task assignment cannot be cancelled. Current status: " + assignment.getStatus());
        }
        
        assignment.setStatus(AssignmentStatus.cancelled);
        assignment.setSpecialistResponseReason(reason);
        assignment.setSpecialistRespondedAt(Instant.now());
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment cancelled successfully: assignmentId={}, reason={}", assignmentId, reason);
        
        // Gửi notification cho manager
        try {
            Contract contract = contractRepository.findById(assignment.getContractId())
                .orElse(null);
            
            if (contract != null && contract.getManagerUserId() != null) {
                CreateNotificationRequest managerNotif = CreateNotificationRequest.builder()
                        .userId(contract.getManagerUserId())
                        .type(NotificationType.TASK_ASSIGNMENT_CANCELED)
                        .title("Task assignment đã bị hủy")
                        .content(String.format("Specialist đã hủy task assignment cho contract #%s. Task type: %s. Lý do: %s", 
                                contract.getContractNumber() != null ? contract.getContractNumber() : assignment.getContractId(),
                                assignment.getTaskType(),
                                reason))
                        .referenceId(assignmentId)
                        .referenceType("TASK_ASSIGNMENT")
                        .actionUrl("/manager/task-assignments?contractId=" + assignment.getContractId())
                        .build();
                
                notificationServiceFeignClient.createNotification(managerNotif);
                log.info("Sent task cancellation notification to manager: userId={}, assignmentId={}, contractId={}", 
                        contract.getManagerUserId(), assignmentId, assignment.getContractId());
            } else {
                log.warn("Cannot send notification: contract not found or managerUserId is null. contractId={}, assignmentId={}", 
                        assignment.getContractId(), assignmentId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to send task cancellation notification: assignmentId={}, error={}", 
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
            throw new RuntimeException(
                "Task assignment cannot report issue. Current status: " + assignment.getStatus());
        }
        
        // Set issue flag và thông tin
        assignment.setHasIssue(true);
        assignment.setIssueReason(reason);
        assignment.setIssueReportedAt(Instant.now());
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Issue reported successfully: assignmentId={}", assignmentId);
        
        // Gửi notification cho manager
        try {
            Contract contract = contractRepository.findById(assignment.getContractId())
                .orElse(null);
            
            if (contract != null && contract.getManagerUserId() != null) {
                CreateNotificationRequest notifRequest = CreateNotificationRequest.builder()
                        .userId(contract.getManagerUserId())
                        .type(NotificationType.TASK_ASSIGNMENT_CANCELED) // Có thể tạo type mới TASK_ISSUE_REPORTED sau
                        .title("Task có vấn đề / không kịp deadline")
                        .content(String.format("Specialist đã báo issue cho task assignment của contract #%s. Task type: %s. Lý do: %s. Vui lòng kiểm tra và xử lý.", 
                                contract.getContractNumber() != null ? contract.getContractNumber() : assignment.getContractId(),
                                assignment.getTaskType(),
                                reason))
                        .referenceId(assignmentId)
                        .referenceType("TASK_ASSIGNMENT")
                        .actionUrl("/manager/task-assignments?contractId=" + assignment.getContractId())
                        .build();
                
                notificationServiceFeignClient.createNotification(notifRequest);
                log.info("Sent issue report notification to manager: userId={}, assignmentId={}, contractId={}", 
                        contract.getManagerUserId(), assignmentId, assignment.getContractId());
            } else {
                log.warn("Cannot send notification: contract not found or managerUserId is null. contractId={}, assignmentId={}", 
                        assignment.getContractId(), assignmentId);
            }
        } catch (Exception e) {
            // Log error nhưng không fail transaction
            log.error("Failed to send issue report notification: assignmentId={}, error={}", 
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
            throw new RuntimeException("Task assignment does not belong to this contract");
        }
        
        // Only allow resolve if task has issue
        if (!Boolean.TRUE.equals(assignment.getHasIssue())) {
            throw new RuntimeException("Task assignment does not have an issue to resolve");
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
            throw new RuntimeException("Task assignment does not belong to this contract");
        }
        
        // Don't allow cancel if already completed
        if (assignment.getStatus() == AssignmentStatus.completed) {
            throw new RuntimeException("Cannot cancel task assignment that is already completed");
        }
        
        // Don't allow cancel if already cancelled
        if (assignment.getStatus() == AssignmentStatus.cancelled) {
            throw new RuntimeException("Task assignment is already cancelled");
        }
        
        // Set status to cancelled
        assignment.setStatus(AssignmentStatus.cancelled);
        assignment.setSpecialistRespondedAt(Instant.now());
        // Giữ lại thông tin issue report (issueReason, issueReportedAt) để lưu lịch sử
        // Chỉ clear hasIssue flag vì task đã bị cancel
        assignment.setHasIssue(false);
        // Không clear issueReason và issueReportedAt - giữ lại để biết lý do báo issue
        
        TaskAssignment saved = taskAssignmentRepository.save(assignment);
        log.info("Task assignment cancelled by manager successfully: assignmentId={}, contractId={}, hadIssue={}", 
            assignmentId, contractId, saved.getIssueReason() != null);
        
        // Gửi notification cho specialist
        try {
            if (assignment.getSpecialistId() != null) {
                String specialistUserId = assignment.getSpecialistUserIdSnapshot();
                if (specialistUserId != null && !specialistUserId.isBlank()) {
                    String issueInfo = "";
                    if (saved.getIssueReason() != null) {
                        issueInfo = String.format(" (Bạn đã báo issue: %s)", saved.getIssueReason());
                    }
                    
                    CreateNotificationRequest specialistNotif = CreateNotificationRequest.builder()
                            .userId(specialistUserId)
                            .type(NotificationType.TASK_ASSIGNMENT_CANCELED)
                            .title("Task đã bị hủy bởi Manager")
                            .content(String.format("Manager đã hủy task %s cho contract #%s.%s Task sẽ được gán lại cho specialist khác.", 
                                    assignment.getTaskType(),
                                    contract.getContractNumber() != null ? contract.getContractNumber() : contractId,
                                    issueInfo))
                            .referenceId(assignmentId)
                            .referenceType("TASK_ASSIGNMENT")
                            .actionUrl("/transcription/my-tasks")
                            .build();
                    
                    notificationServiceFeignClient.createNotification(specialistNotif);
                    log.info("Sent task cancellation notification to specialist: userId={}, specialistId={}, assignmentId={}, contractId={}", 
                        specialistUserId, assignment.getSpecialistId(), assignmentId, contractId);
                } else {
                    log.warn("Specialist userId not available for specialistId={}, assignmentId={}", 
                        assignment.getSpecialistId(), assignmentId);
                }
            }
        } catch (Exception e) {
            log.error("Failed to send cancellation notification to specialist: assignmentId={}, error={}", 
                assignmentId, e.getMessage(), e);
        }
        
        return taskAssignmentMapper.toResponse(saved);
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
            log.warn("userId claim not found in JWT, falling back to subject");
            return jwt.getSubject();
        }
        throw UserNotAuthenticatedException.create();
    }
}

