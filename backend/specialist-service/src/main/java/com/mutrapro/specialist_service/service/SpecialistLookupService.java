package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.client.ProjectServiceFeignClient;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.SpecialistTaskStats;
import com.mutrapro.shared.dto.TaskStatsRequest;
import com.mutrapro.shared.dto.TaskStatsResponse;
import com.mutrapro.specialist_service.mapper.SpecialistMapper;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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
        List<SpecialistResponse> responses = specialistMapper.toSpecialistResponseList(specialists);

        // Fetch task stats và cancelled specialist IDs trong 1 API call
        TaskStatsResponse statsResponse = fetchTaskStats(
            responses.stream().map(SpecialistResponse::getSpecialistId).collect(Collectors.toList()),
            milestoneId,
            contractId
        );

        // Nếu có cancelled specialist IDs, loại bỏ chúng khỏi danh sách
        if (statsResponse != null && statsResponse.getCancelledSpecialistIds() != null 
            && !statsResponse.getCancelledSpecialistIds().isEmpty()) {
            responses = responses.stream()
                .filter(response -> !statsResponse.getCancelledSpecialistIds().contains(response.getSpecialistId()))
                .collect(Collectors.toList());
            log.debug("Filtered out {} cancelled specialists for milestone: milestoneId={}, contractId={}", 
                statsResponse.getCancelledSpecialistIds().size(), milestoneId, contractId);
        }

        // Set stats cho từng specialist
        Map<String, SpecialistTaskStats> statsBySpecialist = 
            statsResponse != null && statsResponse.getStatsBySpecialist() != null 
                ? statsResponse.getStatsBySpecialist() 
                : new java.util.HashMap<>();
        responses.forEach(response -> {
            SpecialistTaskStats stats = statsBySpecialist.get(response.getSpecialistId());
            response.setTotalOpenTasks(stats != null ? stats.getTotalOpenTasks() : 0);
            response.setTasksInSlaWindow(stats != null ? stats.getTasksInSlaWindow() : 0);
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
     * Fetch task stats và cancelled specialist IDs từ project-service trong 1 API call
     */
    private TaskStatsResponse fetchTaskStats(
            List<String> specialistIds,
            String milestoneId,
            String contractId) {
        if (specialistIds == null || specialistIds.isEmpty()) {
            return TaskStatsResponse.builder()
                .statsBySpecialist(new HashMap<>())
                .cancelledSpecialistIds(List.of())
                .build();
        }

        try {
            TaskStatsRequest request = TaskStatsRequest.builder()
                .specialistIds(specialistIds)
                .contractId(contractId)
                .milestoneId(milestoneId)
                .build();

            ApiResponse<com.mutrapro.shared.dto.TaskStatsResponse> response =
                projectServiceFeignClient.getTaskStats(request);

            if (response != null && "success".equalsIgnoreCase(response.getStatus())
                && response.getData() != null) {
                return response.getData();
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch task stats for {} specialists: {}",
                specialistIds.size(), ex.getMessage());
        }

        return TaskStatsResponse.builder()
            .statsBySpecialist(new HashMap<>())
            .cancelledSpecialistIds(List.of())
            .build();
    }


    /**
     * Lấy specialist theo specialistId (cho manager)
     */
    public SpecialistResponse getSpecialistById(String specialistId) {
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));
        SpecialistResponse response = specialistMapper.toSpecialistResponse(specialist);
        TaskStatsResponse statsResponse = fetchTaskStats(List.of(specialistId), null, null);
        SpecialistTaskStats stat = statsResponse != null && statsResponse.getStatsBySpecialist() != null
            ? statsResponse.getStatsBySpecialist().get(specialistId) 
            : null;
        response.setTotalOpenTasks(stat != null ? stat.getTotalOpenTasks() : 0);
        response.setTasksInSlaWindow(stat != null ? stat.getTasksInSlaWindow() : 0);
        
        return response;
    }
}

