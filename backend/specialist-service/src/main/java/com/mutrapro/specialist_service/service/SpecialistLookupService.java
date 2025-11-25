package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.client.IdentityServiceFeignClient;
import com.mutrapro.specialist_service.client.ProjectServiceFeignClient;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.specialist_service.mapper.SpecialistMapper;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpecialistLookupService {

    private final SpecialistRepository specialistRepository;
    private final SpecialistMapper specialistMapper;
    private final IdentityServiceFeignClient identityServiceFeignClient;
    private final ProjectServiceFeignClient projectServiceFeignClient;

    /**
     * Lấy danh sách specialists đang active, option filter theo specialization (string)
     * @param milestoneId (optional) ID của milestone đang assign - dùng để tính tasksInSlaWindow
     * @param contractId (optional) ID của contract - cần khi có milestoneId
     */
    public List<SpecialistResponse> getAvailableSpecialists(
            String specialization, 
            List<String> skillNames,
            String milestoneId,
            String contractId) {
        List<Specialist> specialists;
        SpecialistStatus status = SpecialistStatus.ACTIVE;
        if (specialization != null && !specialization.isBlank()) {
            try {
                SpecialistType type = SpecialistType.valueOf(specialization.toUpperCase());
                specialists = specialistRepository.findBySpecializationAndStatus(type, status);
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid specialization filter: {}", specialization);
                specialists = specialistRepository.findByStatus(status);
            }
        } else {
            //If no specialization, return all active specialists
            specialists = specialistRepository.findByStatus(status);
        }
        if (skillNames != null && !skillNames.isEmpty()) {
            specialists = specialists.stream()
                .filter(specialist -> hasAnySkillName(specialist, skillNames))
                .collect(Collectors.toList());
        }
        Map<String, Specialist> specialistMap = specialists.stream()
            .collect(Collectors.toMap(Specialist::getSpecialistId, s -> s));
        // Tính SLA window từ milestone (nếu có)
        final LocalDateTime slaWindowEnd;
        if (milestoneId != null && !milestoneId.isBlank() && contractId != null && !contractId.isBlank()) {
            slaWindowEnd = calculateSlaWindowEnd(milestoneId, contractId);
        } else {
            slaWindowEnd = null;
        }
        
        List<SpecialistResponse> responses = specialistMapper.toSpecialistResponseList(specialists);
        final LocalDateTime finalSlaWindowEnd = slaWindowEnd; // Final reference for lambda
        
        // Batch fetch task assignments cho tất cả specialists cùng lúc
        Map<String, List<Map<String, Object>>> tasksBySpecialist = fetchTaskAssignmentsBatch(
            responses.stream().map(SpecialistResponse::getSpecialistId).collect(Collectors.toList())
        );
        
        // Tạo cache chung cho contract timeline để tái sử dụng giữa các specialists
        // (nhiều specialists có thể có tasks từ cùng 1 contract)
        Map<String, ContractTimeline> sharedContractTimelineCache = new HashMap<>();
        
        // Tính stats cho từng specialist từ batch data
        responses.forEach(response -> {
            Specialist specialist = specialistMap.get(response.getSpecialistId());
            if (specialist != null) {
                // Tính real-time totalOpenTasks và tasksInSlaWindow từ batch data
                List<Map<String, Object>> tasks = tasksBySpecialist.getOrDefault(
                    specialist.getSpecialistId(), 
                    new ArrayList<>()
                );
                calculateTaskStatsFromData(response, tasks, finalSlaWindowEnd, sharedContractTimelineCache);
                
                try {
                    var userResponse = identityServiceFeignClient.getUserBasicInfo(specialist.getUserId());
                    if (userResponse != null && userResponse.getData() != null) {
                        response.setFullName(userResponse.getData().getFullName());
                        response.setEmail(userResponse.getData().getEmail());
                    }
                } catch (Exception ex) {
                    log.warn("Failed to fetch user info for specialist {}: {}", specialist.getSpecialistId(), ex.getMessage());
                }
            }
        });
        responses.sort((a, b) -> {
            int slaA = a.getTasksInSlaWindow() != null ? a.getTasksInSlaWindow() : 0;
            int slaB = b.getTasksInSlaWindow() != null ? b.getTasksInSlaWindow() : 0;
            if (slaA != slaB) return Integer.compare(slaA, slaB);
            int openA = a.getTotalOpenTasks() != null ? a.getTotalOpenTasks() : 0;
            int openB = b.getTotalOpenTasks() != null ? b.getTotalOpenTasks() : 0;
            if (openA != openB) return Integer.compare(openA, openB);
            int expA = a.getExperienceYears() != null ? a.getExperienceYears() : 0;
            int expB = b.getExperienceYears() != null ? b.getExperienceYears() : 0;
            return Integer.compare(expB, expA);
        });
        return responses;
    }

    /**
     * Kiểm tra xem specialist có ít nhất một skill name trong danh sách yêu cầu không
     */
    private boolean hasAnySkillName(Specialist specialist, List<String> skillNames) {
        if (skillNames == null || skillNames.isEmpty()) {
            return true;
        }
        List<String> ownedSkillNames = specialist.getSpecialistSkills().stream()
            .filter(skill -> skill.getSkill() != null && skill.getSkill().getSkillName() != null)
            .map(skill -> normalizeSkillName(skill.getSkill().getSkillName()))
            .toList();
        return skillNames.stream()
            .map(this::normalizeSkillName)
            .anyMatch(required ->
                ownedSkillNames.stream().anyMatch(owned ->
                    owned.equals(required) || owned.contains(required) || required.contains(owned)
                )
            );
    }

    /**
     * Normalize skill name
     */
    private String normalizeSkillName(String value) {
        if (value == null) return "";
        return value
            .trim()
            .toLowerCase()
            .replaceAll("[^a-z0-9]", "");
    }

    /**
     * Tính SLA window end từ milestone
     * Option A: dùng plannedDueDate của milestone (nếu có)
     * Option B: dùng milestoneSlaDays → slaWindowEnd = now + milestoneSlaDays
     */
    private LocalDateTime calculateSlaWindowEnd(String milestoneId, String contractId) {
        try {
            ApiResponse<Map<String, Object>> milestoneResponse = 
                projectServiceFeignClient.getMilestoneById(contractId, milestoneId);
            
            if (milestoneResponse != null && "success".equals(milestoneResponse.getStatus()) 
                && milestoneResponse.getData() != null) {
                
                Map<String, Object> milestone = milestoneResponse.getData();
                LocalDateTime now = LocalDateTime.now();
                
                // Option A: dùng plannedDueDate (nếu có)
                Object plannedDueDateObj = milestone.get("plannedDueDate");
                if (plannedDueDateObj != null) {
                    LocalDateTime plannedDueDate = parseLocalDateTime(plannedDueDateObj);
                    if (plannedDueDate != null) {
                        return plannedDueDate;
                    }
                }
                
                Integer milestoneSlaDays = parseInteger(milestone.get("milestoneSlaDays"));
                // Option B: dùng milestoneSlaDays với plannedStartAt (nếu có)
                LocalDateTime plannedStartAt = parseLocalDateTime(milestone.get("plannedStartAt"));
                if (plannedStartAt != null && milestoneSlaDays != null && milestoneSlaDays > 0) {
                    return plannedStartAt.plusDays(milestoneSlaDays);
                }
                
                // Option C: fallback theo expectedStart + cumulative SLA
                TimelineDates fallbackDates = calculateFallbackTimelineDates(
                    contractId,
                    milestoneId,
                    milestoneSlaDays,
                    null
                );
                if (fallbackDates != null && fallbackDates.dueDate() != null) {
                    return fallbackDates.dueDate();
                }
                
                // Option D: cuối cùng dùng now + slaDays
                if (milestoneSlaDays != null && milestoneSlaDays > 0) {
                    return now.plusDays(milestoneSlaDays);
                }
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch milestone info for SLA window calculation: milestoneId={}, contractId={}, error: {}", 
                milestoneId, contractId, ex.getMessage());
        }
        
        return null; // Không tính được SLA window
    }

    /**
     * Batch fetch task assignments cho nhiều specialists cùng lúc
     */
    private Map<String, List<Map<String, Object>>> fetchTaskAssignmentsBatch(List<String> specialistIds) {
        if (specialistIds == null || specialistIds.isEmpty()) {
            return new HashMap<>();
        }
        
        try {
            ApiResponse<Map<String, List<Map<String, Object>>>> batchResponse = 
                projectServiceFeignClient.getTaskAssignmentsBySpecialistIds(specialistIds);
            
            if (batchResponse != null && "success".equals(batchResponse.getStatus()) 
                && batchResponse.getData() != null) {
                return batchResponse.getData();
            }
        } catch (Exception ex) {
            log.warn("Failed to batch fetch task assignments for {} specialists: {}", 
                specialistIds.size(), ex.getMessage());
        }
        
        return new HashMap<>();
    }

    /**
     * Tính real-time totalOpenTasks và tasksInSlaWindow từ task assignments data (đã có sẵn)
     * @param tasks Danh sách tasks đã fetch sẵn
     * @param slaWindowEnd SLA window end từ milestone đang assign (null nếu không có milestone)
     * @param contractTimelineCache Cache chung cho contract timeline (để tái sử dụng giữa các specialists)
     */
    private void calculateTaskStatsFromData(SpecialistResponse response, List<Map<String, Object>> tasks, 
            LocalDateTime slaWindowEnd, Map<String, ContractTimeline> contractTimelineCache) {
        if (tasks == null || tasks.isEmpty()) {
            response.setTotalOpenTasks(0);
            response.setTasksInSlaWindow(0);
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        
        // Tính totalOpenTasks: đếm tasks có status = assigned hoặc in_progress
        long totalOpenTasks = tasks.stream()
            .filter(task -> {
                String status = (String) task.get("status");
                return "assigned".equalsIgnoreCase(status) || "in_progress".equalsIgnoreCase(status);
            })
            .count();
        
        // Tính tasksInSlaWindow: đếm tasks có plannedDueDate nằm trong [now, slaWindowEnd]
        long tasksInSlaWindow = 0;
        if (slaWindowEnd != null) {
            tasksInSlaWindow = tasks.stream()
                .filter(task -> {
                    String status = (String) task.get("status");
                    // Chỉ tính cho tasks đang làm (assigned hoặc in_progress)
                    if (!"assigned".equalsIgnoreCase(status) && !"in_progress".equalsIgnoreCase(status)) {
                        return false;
                    }
                    
                    // Lấy plannedDueDate từ milestone của task
                    @SuppressWarnings("unchecked")
                    Map<String, Object> taskMilestone = (Map<String, Object>) task.get("milestone");
                    if (taskMilestone == null) return false;
                    
                    Object plannedDueDateObj = taskMilestone.get("plannedDueDate");
                    LocalDateTime taskPlannedDueDate = parseLocalDateTime(plannedDueDateObj);
                    
                    if (taskPlannedDueDate == null) {
                        String contractId = (String) task.get("contractId");
                        String milestoneId = taskMilestone.get("milestoneId") != null
                            ? taskMilestone.get("milestoneId").toString()
                            : null;
                        
                        TimelineDates fallbackDates = calculateFallbackTimelineDates(
                            contractId,
                            milestoneId,
                            parseInteger(taskMilestone.get("milestoneSlaDays")),
                            contractTimelineCache
                        );
                        if (fallbackDates != null) {
                            taskPlannedDueDate = fallbackDates.dueDate();
                        }
                    }
                    
                    if (taskPlannedDueDate == null) return false;
                    
                    // Kiểm tra nếu task's plannedDueDate nằm trong [now, slaWindowEnd]
                    return !taskPlannedDueDate.isBefore(now) && !taskPlannedDueDate.isAfter(slaWindowEnd);
                })
                .count();
        }
        
        response.setTotalOpenTasks((int) totalOpenTasks);
        response.setTasksInSlaWindow((int) tasksInSlaWindow);
    }

    /**
     * Tính real-time totalOpenTasks và tasksInSlaWindow từ task assignments (gọi API riêng lẻ cho 1 specialist)
     * Sử dụng batch API ngay cả khi chỉ có 1 specialist để tái sử dụng logic
     * @param slaWindowEnd SLA window end từ milestone đang assign (null nếu không có milestone)
     */
    private void calculateTaskStats(SpecialistResponse response, String specialistId, LocalDateTime slaWindowEnd) {
        try {
            // Dùng batch API ngay cả khi chỉ có 1 specialist để tái sử dụng logic
            Map<String, List<Map<String, Object>>> batchResult = fetchTaskAssignmentsBatch(List.of(specialistId));
            List<Map<String, Object>> tasks = batchResult.getOrDefault(specialistId, new ArrayList<>());
            // Tạo cache riêng cho trường hợp single specialist (không cần share)
            Map<String, ContractTimeline> contractTimelineCache = new HashMap<>();
            calculateTaskStatsFromData(response, tasks, slaWindowEnd, contractTimelineCache);
        } catch (Exception ex) {
            log.warn("Failed to fetch task stats for specialist {}: {}", specialistId, ex.getMessage());
            // Nếu lỗi, set về 0
            response.setTotalOpenTasks(0);
            response.setTasksInSlaWindow(0);
        }
    }

    /**
     * Lấy specialist theo specialistId (cho manager)
     */
    public SpecialistResponse getSpecialistById(String specialistId) {
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));
        SpecialistResponse response = specialistMapper.toSpecialistResponse(specialist);
        // Tính real-time task stats (không có milestone context nên tasksInSlaWindow = 0)
        calculateTaskStats(response, specialistId, null);
        
        // Fetch user info từ identity-service để có fullName và email
        try {
            var userResponse = identityServiceFeignClient.getUserBasicInfo(specialist.getUserId());
            if (userResponse != null && userResponse.getData() != null) {
                response.setFullName(userResponse.getData().getFullName());
                response.setEmail(userResponse.getData().getEmail());
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch user info for specialist {}: {}", specialistId, ex.getMessage());
        }
        
        return response;
    }
    
    private TimelineDates calculateFallbackTimelineDates(
            String contractId,
            String milestoneId,
            Integer milestoneSlaDays,
            Map<String, ContractTimeline> timelineCache) {
        if (contractId == null || milestoneId == null) {
            return null;
        }
        
        ContractTimeline timeline = getContractTimeline(contractId, timelineCache);
        if (timeline == null) {
            return null;
        }
        
        LocalDateTime baseStart = timeline.expectedStart != null
            ? timeline.expectedStart
            : LocalDateTime.now();
        
        int cumulativeDays = 0;
        for (MilestoneSummary summary : timeline.milestones) {
            int sla = summary.slaDays != null ? summary.slaDays : 0;
            if (milestoneId.equals(summary.milestoneId)) {
                int effectiveSla = milestoneSlaDays != null ? milestoneSlaDays : sla;
                LocalDateTime fallbackStart = baseStart.plusDays(cumulativeDays);
                LocalDateTime fallbackDue = effectiveSla > 0 ? fallbackStart.plusDays(effectiveSla) : fallbackStart;
                return new TimelineDates(fallbackStart, fallbackDue);
            }
            cumulativeDays += sla;
        }
        
        return null;
    }
    
    private ContractTimeline getContractTimeline(String contractId, Map<String, ContractTimeline> timelineCache) {
        if (contractId == null) {
            return null;
        }
        
        if (timelineCache != null && timelineCache.containsKey(contractId)) {
            return timelineCache.get(contractId);
        }
        
        try {
            ApiResponse<Map<String, Object>> contractResponse =
                projectServiceFeignClient.getContractById(contractId);
            if (contractResponse != null && "success".equals(contractResponse.getStatus())
                && contractResponse.getData() != null) {
                ContractTimeline timeline = buildContractTimeline(contractResponse.getData());
                if (timelineCache != null && timeline != null) {
                    timelineCache.put(contractId, timeline);
                }
                return timeline;
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch contract timeline: contractId={}, error={}", contractId, ex.getMessage());
        }
        
        return null;
    }
    
    private ContractTimeline buildContractTimeline(Map<String, Object> contractData) {
        LocalDateTime expectedStart = parseInstant(contractData.get("expectedStartDate"));
        List<MilestoneSummary> milestones = parseMilestoneSummaries(contractData.get("milestones"));
        return new ContractTimeline(expectedStart, milestones);
    }
    
    private List<MilestoneSummary> parseMilestoneSummaries(Object milestonesObj) {
        List<MilestoneSummary> summaries = new ArrayList<>();
        if (milestonesObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    String milestoneId = map.get("milestoneId") != null
                        ? map.get("milestoneId").toString()
                        : null;
                    Integer orderIndex = parseInteger(map.get("orderIndex"));
                    Integer slaDays = parseInteger(map.get("milestoneSlaDays"));
                    summaries.add(new MilestoneSummary(milestoneId, orderIndex, slaDays));
                }
            }
        }
        summaries.sort(Comparator.comparingInt(ms -> ms.orderIndex != null ? ms.orderIndex : Integer.MAX_VALUE));
        return summaries;
    }
    
    /**
     * Parse LocalDateTime từ Object (thường là String format ISO-8601)
     */
    private LocalDateTime parseLocalDateTime(Object obj) {
        if (obj == null) return null;
        
        try {
            if (obj instanceof String) {
                String dateStr = (String) obj;
                if (dateStr.contains(".")) {
                    dateStr = dateStr.substring(0, dateStr.indexOf("."));
                }
                return LocalDateTime.parse(dateStr);
            }
        } catch (Exception e) {
            log.warn("Failed to parse LocalDateTime from object: {}, error: {}", obj, e.getMessage());
        }
        
        return null;
    }
    
    private LocalDateTime parseInstant(Object obj) {
        if (obj == null) return null;
        try {
            if (obj instanceof String str && !str.isBlank()) {
                Instant instant = Instant.parse(str);
                return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
            }
        } catch (Exception e) {
            log.warn("Failed to parse Instant from object: {}, error: {}", obj, e.getMessage());
        }
        return null;
    }
    
    private Integer parseInteger(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number number) {
            return number.intValue();
        }
        if (obj instanceof String str && !str.isBlank()) {
            try {
                return Integer.parseInt(str);
            } catch (NumberFormatException e) {
                log.warn("Failed to parse integer from '{}': {}", str, e.getMessage());
            }
        }
        return null;
    }
    
    private record TimelineDates(LocalDateTime startDate, LocalDateTime dueDate) {}
    
    private record ContractTimeline(LocalDateTime expectedStart, List<MilestoneSummary> milestones) {}
    
    private record MilestoneSummary(String milestoneId, Integer orderIndex, Integer slaDays) {}
}

