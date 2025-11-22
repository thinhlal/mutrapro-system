package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.client.IdentityServiceFeignClient;
import com.mutrapro.specialist_service.mapper.SpecialistMapper;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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

    /**
     * Lấy danh sách specialists đang active, option filter theo specialization (string)
     */
    public List<SpecialistResponse> getAvailableSpecialists(String specialization, List<String> skillNames) {
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
        List<SpecialistResponse> responses = specialistMapper.toSpecialistResponseList(specialists);
        responses.forEach(response -> {
            Specialist specialist = specialistMap.get(response.getSpecialistId());
            if (specialist != null) {
                response.setTotalOpenTasks(specialist.getCurrentOpenTasks());
                response.setTasksInSlaWindow(specialist.getTasksInSlaWindow());
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
     * Lấy specialist theo specialistId (cho manager)
     */
    public SpecialistResponse getSpecialistById(String specialistId) {
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));
        return specialistMapper.toSpecialistResponse(specialist);
    }
}

