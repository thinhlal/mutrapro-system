package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.response.ArtistDemoResponse;
import com.mutrapro.specialist_service.dto.response.SpecialistDetailResponse;
import com.mutrapro.specialist_service.dto.response.SpecialistResponse;
import com.mutrapro.specialist_service.dto.response.SpecialistSkillResponse;
import com.mutrapro.specialist_service.entity.ArtistDemo;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.entity.SpecialistSkill;
import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.client.ProjectServiceFeignClient;
import com.mutrapro.shared.dto.ApiResponse;
import com.mutrapro.shared.dto.SpecialistTaskStats;
import com.mutrapro.shared.dto.TaskStatsRequest;
import com.mutrapro.shared.dto.TaskStatsResponse;
import com.mutrapro.specialist_service.mapper.ArtistDemoMapper;
import com.mutrapro.specialist_service.mapper.SpecialistMapper;
import com.mutrapro.specialist_service.mapper.SpecialistSkillMapper;
import com.mutrapro.specialist_service.repository.ArtistDemoRepository;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import com.mutrapro.specialist_service.repository.SpecialistSkillRepository;
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
    private final SpecialistSkillRepository specialistSkillRepository;
    private final ArtistDemoRepository artistDemoRepository;
    private final SpecialistSkillMapper specialistSkillMapper;
    private final ArtistDemoMapper artistDemoMapper;

    /**
     * Lấy danh sách specialists đang active, option filter theo specialization (string)
     * @param milestoneId (optional) ID của milestone đang assign - dùng để tính tasksInSlaWindow
     * @param contractId (optional) ID của contract - cần khi có milestoneId
     */
    public List<SpecialistResponse> getAvailableSpecialists(
            String specialization, 
            List<String> skillNames,
            String milestoneId,
            String contractId,
            String mainInstrumentName) {
        List<Specialist> specialists;
        SpecialistStatus status = SpecialistStatus.ACTIVE;
        SpecialistType specializationType = null;
        if (specialization != null && !specialization.isBlank()) {
            try {
                specializationType = SpecialistType.valueOf(specialization.toUpperCase());
                specialists = specialistRepository.findBySpecializationAndStatus(specializationType, status);
            } catch (IllegalArgumentException ex) {
                log.warn("Invalid specialization filter: {}", specialization);
                specialists = specialistRepository.findByStatus(status);
            }
        } else {
            //If no specialization, return all active specialists
            specialists = specialistRepository.findByStatus(status);
        }
        // Filter logic:
        // - Transcription: chỉ có 1 instrument → specialist PHẢI match với instrument đó (bắt buộc)
        // - Arrangement/Arrangement with Recording: có nhiều instruments và có 1 main instrument 
        //   → specialist PHẢI match với main instrument (bắt buộc), các instruments còn lại dùng để tính matchRatio
        boolean isArrangement = specializationType != null && 
            (specializationType == SpecialistType.ARRANGEMENT);
        if (skillNames != null && !skillNames.isEmpty()) {
            if (isArrangement && mainInstrumentName != null && !mainInstrumentName.isBlank()) {
                // Arrangement: specialist PHẢI match với main instrument (bắt buộc)
                String normalizedMain = normalizeSkillName(mainInstrumentName);
                specialists = specialists.stream()
                    .filter(specialist -> hasSkillName(specialist, normalizedMain))
                    .collect(Collectors.toList());
            } else if (!isArrangement && skillNames.size() == 1) {
                // Transcription: chỉ có 1 instrument → specialist PHẢI match với instrument đó (bắt buộc)
                String normalizedSkill = normalizeSkillName(skillNames.get(0));
                specialists = specialists.stream()
                    .filter(specialist -> hasSkillName(specialist, normalizedSkill))
                    .collect(Collectors.toList());
            } else {
                // Trường hợp khác: specialist chỉ cần match ít nhất 1 instrument
                specialists = specialists.stream()
                    .filter(specialist -> hasAnySkillName(specialist, skillNames))
                    .collect(Collectors.toList());
            }
        }
        
        // Tạo Map mapping specialistId -> Specialist để tính matchRatio sau (chỉ cho arrangement)
        Map<String, Specialist> specialistMap = null;
        if (isArrangement) {
            specialistMap = specialists.stream()
                .collect(Collectors.toMap(Specialist::getSpecialistId, s -> s));
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

        // Tính matchRatio cho mỗi specialist CHỈ KHI là ARRANGEMENT
        // matchRatio = matchedInstrumentCount (không tính main) / requestedInstrumentCount (không tính main)
        // Main instrument đã được filter bắt buộc, nên chỉ tính matchRatio với các instruments còn lại
        Map<String, Double> matchRatioMap = new HashMap<>();
        if (isArrangement && skillNames != null && !skillNames.isEmpty() && specialistMap != null) {
            // Lọc ra các instruments không phải main để tính matchRatio
            List<String> nonMainInstruments = skillNames.stream()
                .filter(name -> {
                    if (mainInstrumentName == null || mainInstrumentName.isBlank()) {
                        return true; // Nếu không có main, tính tất cả
                    }
                    return !normalizeSkillName(name).equals(normalizeSkillName(mainInstrumentName));
                })
                .collect(Collectors.toList());
            
            for (SpecialistResponse response : responses) {
                Specialist specialist = specialistMap.get(response.getSpecialistId());
                if (specialist != null) {
                    // Chỉ đếm các instruments không phải main
                    int matchedCount = countMatchedSkills(specialist, nonMainInstruments);
                    double matchRatio = nonMainInstruments.size() > 0 
                        ? (double) matchedCount / nonMainInstruments.size() 
                        : 1.0; // Nếu không có instruments nào khác ngoài main, matchRatio = 1.0
                    matchRatioMap.put(response.getSpecialistId(), matchRatio);
                }
            }
        }

        // Sort: 
        // - Nếu là ARRANGEMENT: ưu tiên matchRatio (cao nhất lên đầu), sau đó SLA, tasks, experience
        // - Nếu không phải ARRANGEMENT: chỉ sort theo SLA, tasks, experience (không có matchRatio)
        final Map<String, Double> finalMatchRatioMap = matchRatioMap;
        final boolean finalIsArrangement = isArrangement;
        responses.sort((a, b) -> {
            // 1. Sort theo matchRatio CHỈ KHI là ARRANGEMENT - cao nhất lên đầu
            if (finalIsArrangement && !finalMatchRatioMap.isEmpty()) {
                double ratioA = finalMatchRatioMap.getOrDefault(a.getSpecialistId(), 0.0);
                double ratioB = finalMatchRatioMap.getOrDefault(b.getSpecialistId(), 0.0);
                if (Double.compare(ratioB, ratioA) != 0) {
                    return Double.compare(ratioB, ratioA); // Descending: cao nhất lên đầu
                }
            }
            // 2. Sort theo tasksInSlaWindow (thấp nhất lên đầu - ít tasks trong SLA window hơn)
            int slaA = a.getTasksInSlaWindow() != null ? a.getTasksInSlaWindow() : 0;
            int slaB = b.getTasksInSlaWindow() != null ? b.getTasksInSlaWindow() : 0;
            if (slaA != slaB) return Integer.compare(slaA, slaB);
            // 3. Sort theo totalOpenTasks (thấp nhất lên đầu)
            int openA = a.getTotalOpenTasks() != null ? a.getTotalOpenTasks() : 0;
            int openB = b.getTotalOpenTasks() != null ? b.getTotalOpenTasks() : 0;
            if (openA != openB) return Integer.compare(openA, openB);
            // 4. Sort theo experienceYears (cao nhất lên đầu)
            int expA = a.getExperienceYears() != null ? a.getExperienceYears() : 0;
            int expB = b.getExperienceYears() != null ? b.getExperienceYears() : 0;
            return Integer.compare(expB, expA);
        });
        return responses;
    }

    /**
     * Kiểm tra xem specialist có skill name cụ thể không
     */
    private boolean hasSkillName(Specialist specialist, String skillName) {
        if (skillName == null || skillName.isBlank()) {
            return true;
        }
        List<String> ownedSkillNames = specialist.getSpecialistSkills().stream()
            .filter(skill -> skill.getSkill() != null && skill.getSkill().getSkillName() != null)
            .map(skill -> normalizeSkillName(skill.getSkill().getSkillName()))
            .toList();
        return ownedSkillNames.stream().anyMatch(owned ->
            owned.equals(skillName) || owned.contains(skillName) || skillName.contains(owned)
        );
    }

    /**
     * Kiểm tra xem specialist có ít nhất một skill name trong danh sách yêu cầu không
     * Filter rule: requestedInstrumentIds ∩ specialist.instrumentSkills ≠ ∅
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
     * Đếm số lượng skills match giữa specialist và danh sách yêu cầu
     * Dùng để tính matchRatio = matchedCount / requestedCount
     */
    private int countMatchedSkills(Specialist specialist, List<String> skillNames) {
        if (skillNames == null || skillNames.isEmpty()) {
            return 0;
        }
        List<String> ownedSkillNames = specialist.getSpecialistSkills().stream()
            .filter(skill -> skill.getSkill() != null && skill.getSkill().getSkillName() != null)
            .map(skill -> normalizeSkillName(skill.getSkill().getSkillName()))
            .toList();
        
        return (int) skillNames.stream()
            .map(this::normalizeSkillName)
            .filter(required ->
                ownedSkillNames.stream().anyMatch(owned ->
                    owned.equals(required) || owned.contains(required) || required.contains(owned)
                )
            )
            .count();
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

    /**
     * Lấy danh sách vocalists (RECORDING_ARTIST với recordingRoles chứa VOCALIST)
     * Filter theo gender và genres nếu có
     */
    public List<SpecialistResponse> getVocalists(String gender, List<String> genres) {
        SpecialistType specialization = SpecialistType.RECORDING_ARTIST;
        SpecialistStatus status = SpecialistStatus.ACTIVE;
        RecordingRole targetRole = RecordingRole.VOCALIST;
        
        com.mutrapro.specialist_service.enums.Gender genderEnum = null;
        if (gender != null && !gender.isBlank()) {
            try {
                genderEnum = com.mutrapro.specialist_service.enums.Gender.valueOf(gender.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid gender value: {}", gender);
            }
        }
        
        // Lấy tất cả RECORDING_ARTIST specialists
        List<Specialist> recordingArtists = specialistRepository.findRecordingArtists(
            specialization, status, genderEnum);
        
        // Lọc trong service layer: chỉ lấy những specialist có recordingRoles chứa VOCALIST
        List<Specialist> vocalists = recordingArtists.stream()
            .filter(s -> s.getRecordingRoles() != null 
                && s.getRecordingRoles().contains(targetRole))
            .collect(Collectors.toList());
        
        // Filter theo genres nếu có
        if (genres != null && !genres.isEmpty()) {
            vocalists = vocalists.stream()
                .filter(s -> {
                    if (s.getGenres() == null || s.getGenres().isEmpty()) {
                        return false;
                    }
                    // Specialist phải có ít nhất 1 genre trùng với genres được chọn
                    return s.getGenres().stream()
                        .anyMatch(genre -> genres.contains(genre));
                })
                .collect(Collectors.toList());
        }
        
        // Map sang response và thêm main demo preview URL
        return vocalists.stream()
            .map(specialist -> {
                SpecialistResponse response = specialistMapper.toSpecialistResponse(specialist);
                
                // Tìm main demo của specialist
                try {
                    ArtistDemo mainDemo = artistDemoRepository.findMainDemoBySpecialist(specialist);
                    if (mainDemo != null && mainDemo.getIsPublic() && mainDemo.getPreviewUrl() != null) {
                        response.setMainDemoPreviewUrl(mainDemo.getPreviewUrl());
                    }
                } catch (Exception e) {
                    log.debug("No main demo found for specialist {}", specialist.getSpecialistId());
                }
                
                return response;
            })
            .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết specialist theo ID (public - cho customer xem)
     * Bao gồm skills và public demos
     */
    public SpecialistDetailResponse getSpecialistDetail(String specialistId) {
        log.info("Getting specialist detail for ID: {}", specialistId);
        
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> SpecialistNotFoundException.byId(specialistId));
        
        SpecialistResponse specialistResponse = specialistMapper.toSpecialistResponse(specialist);
        
        // Lấy skills với eager loading Skill để tránh LazyInitializationException
        List<SpecialistSkill> skills = specialistSkillRepository.findBySpecialistWithSkill(specialist);
        List<SpecialistSkillResponse> skillsResponse = specialistSkillMapper.toSpecialistSkillResponseList(skills);
        
        // Lấy public demos (chỉ demos có isPublic = true)
        List<ArtistDemoResponse> demosResponse = List.of();
        if (specialist.getSpecialization() == SpecialistType.RECORDING_ARTIST) {
            List<ArtistDemo> publicDemos = artistDemoRepository.findBySpecialistAndIsPublicTrue(specialist);
            demosResponse = artistDemoMapper.toArtistDemoResponseList(publicDemos);
        }
        
        return SpecialistDetailResponse.builder()
            .specialist(specialistResponse)
            .skills(skillsResponse)
            .demos(demosResponse)
            .build();
    }
}

