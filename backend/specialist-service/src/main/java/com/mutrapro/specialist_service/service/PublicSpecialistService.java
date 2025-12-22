package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.response.SpecialistDetailResponse;
import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.entity.SpecialistSkill;
import com.mutrapro.specialist_service.enums.Gender;
import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import com.mutrapro.specialist_service.repository.SpecialistSkillRepository;
import com.mutrapro.specialist_service.repository.ArtistDemoRepository;
import com.mutrapro.specialist_service.entity.ArtistDemo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service cho public endpoints của Specialists
 * Không có @PreAuthorize annotations để cho phép public access
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicSpecialistService {
    
    private final SpecialistRepository specialistRepository;
    private final SpecialistSkillRepository specialistSkillRepository;
    private final SpecialistLookupService specialistLookupService;
    private final SpecialistSlotService specialistSlotService;
    private final ArtistDemoRepository artistDemoRepository;
    
    /**
     * Lấy danh sách vocalists (public access)
     * Filter theo gender và genres nếu có
     */
    public List<Map<String, Object>> getVocalists(String genderStr, List<String> genres) {
        long startTime = System.currentTimeMillis();
        log.info("[getVocalists] Getting vocalists: gender={}, genres={}", genderStr, genres);
        
        // Parse gender
        long parseStart = System.currentTimeMillis();
        Gender gender = null;
        if (genderStr != null && !genderStr.isBlank()) {
            try {
                gender = Gender.valueOf(genderStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("[getVocalists] Invalid gender: {}", genderStr);
            }
        }
        long parseTime = System.currentTimeMillis() - parseStart;
        
        // Lấy tất cả recording artists với gender filter
        long queryStart = System.currentTimeMillis();
        List<Specialist> specialists = specialistRepository.findRecordingArtists(
            SpecialistType.RECORDING_ARTIST,
            SpecialistStatus.ACTIVE,
            gender
        );
        long queryTime = System.currentTimeMillis() - queryStart;
        log.info("[getVocalists] Query specialists took {}ms, found {} specialists", queryTime, specialists.size());
        
        // Filter theo recordingRoles (VOCALIST)
        long filterStart = System.currentTimeMillis();
        specialists = specialists.stream()
            .filter(s -> s.getRecordingRoles() != null && 
                s.getRecordingRoles().contains(RecordingRole.VOCALIST))
            .collect(Collectors.toList());
        
        // Filter theo genres nếu có
        if (genres != null && !genres.isEmpty()) {
            specialists = specialists.stream()
                .filter(s -> s.getGenres() != null && 
                    !Collections.disjoint(s.getGenres(), genres))
                .collect(Collectors.toList());
        }
        long filterTime = System.currentTimeMillis() - filterStart;
        log.info("[getVocalists] Filtering took {}ms, {} specialists after filter", filterTime, specialists.size());
        
        // Batch load main demos để tránh N+1 query problem
        long demoLoadStart = System.currentTimeMillis();
        Map<String, String> mainDemoMap = batchLoadMainDemos(specialists);
        long demoLoadTime = System.currentTimeMillis() - demoLoadStart;
        log.info("[getVocalists] Batch load main demos took {}ms, found {} demos", demoLoadTime, mainDemoMap.size());
        
        // Mapping
        long mappingStart = System.currentTimeMillis();
        List<Map<String, Object>> result = specialists.stream()
            .map(s -> toSpecialistMap(s, mainDemoMap))
            .collect(Collectors.toList());
        long mappingTime = System.currentTimeMillis() - mappingStart;
        log.info("[getVocalists] Mapping took {}ms for {} specialists", mappingTime, specialists.size());
        
        long totalTime = System.currentTimeMillis() - startTime;
        log.info("[getVocalists] Total time: {}ms (parse: {}ms, query: {}ms, filter: {}ms, demoLoad: {}ms, mapping: {}ms)", 
            totalTime, parseTime, queryTime, filterTime, demoLoadTime, mappingTime);
        
        return result;
    }
    
    /**
     * Lấy danh sách specialists theo skill_id (public access)
     * Dùng để lấy instrumentalists cho booking
     * CHỈ lấy RECORDING_ARTIST với INSTRUMENT_PLAYER role (tương tự getVocalists)
     */
    public List<Map<String, Object>> getSpecialistsBySkillId(String skillId) {
        long startTime = System.currentTimeMillis();
        log.info("[getSpecialistsBySkillId] Getting specialists by skillId: {}", skillId);
        
        // Lấy tất cả specialist_skills có skillId này
        long skillQueryStart = System.currentTimeMillis();
        List<SpecialistSkill> specialistSkills = specialistSkillRepository
            .findAll()
            .stream()
            .filter(ss -> ss.getSkill() != null && 
                skillId.equals(ss.getSkill().getSkillId()))
            .collect(Collectors.toList());
        long skillQueryTime = System.currentTimeMillis() - skillQueryStart;
        log.info("[getSpecialistsBySkillId] Query specialist_skills took {}ms, found {} skills", skillQueryTime, specialistSkills.size());
        
        if (specialistSkills.isEmpty()) {
            log.warn("[getSpecialistsBySkillId] No specialists found for skillId: {}", skillId);
            return Collections.emptyList();
        }
        
        // Lấy specialist IDs
        long extractStart = System.currentTimeMillis();
        List<String> specialistIds = specialistSkills.stream()
            .map(ss -> ss.getSpecialist().getSpecialistId())
            .distinct()
            .collect(Collectors.toList());
        long extractTime = System.currentTimeMillis() - extractStart;
        
        // Lấy specialists (chỉ ACTIVE và RECORDING_ARTIST với INSTRUMENT_PLAYER role)
        long specialistQueryStart = System.currentTimeMillis();
        List<Specialist> specialists = specialistRepository.findAllById(specialistIds)
            .stream()
            .filter(s -> s.getStatus() == SpecialistStatus.ACTIVE)
            .filter(s -> s.getSpecialization() == SpecialistType.RECORDING_ARTIST)
            .filter(s -> s.getRecordingRoles() != null && 
                s.getRecordingRoles().contains(RecordingRole.INSTRUMENT_PLAYER))
            .collect(Collectors.toList());
        long specialistQueryTime = System.currentTimeMillis() - specialistQueryStart;
        log.info("[getSpecialistsBySkillId] Query specialists took {}ms, found {} specialists", specialistQueryTime, specialists.size());
        
        // Batch load main demos để tránh N+1 query problem
        long demoLoadStart = System.currentTimeMillis();
        Map<String, String> mainDemoMap = batchLoadMainDemos(specialists);
        long demoLoadTime = System.currentTimeMillis() - demoLoadStart;
        log.info("[getSpecialistsBySkillId] Batch load main demos took {}ms, found {} demos", demoLoadTime, mainDemoMap.size());
        
        // Mapping
        long mappingStart = System.currentTimeMillis();
        List<Map<String, Object>> result = specialists.stream()
            .map(s -> toSpecialistMap(s, mainDemoMap))
            .collect(Collectors.toList());
        long mappingTime = System.currentTimeMillis() - mappingStart;
        log.info("[getSpecialistsBySkillId] Mapping took {}ms for {} specialists", mappingTime, specialists.size());
        
        long totalTime = System.currentTimeMillis() - startTime;
        log.info("[getSpecialistsBySkillId] Total time: {}ms (skillQuery: {}ms, extract: {}ms, specialistQuery: {}ms, demoLoad: {}ms, mapping: {}ms)", 
            totalTime, skillQueryTime, extractTime, specialistQueryTime, demoLoadTime, mappingTime);
        
        return result;
    }
    
    /**
     * Lấy chi tiết specialist theo specialistId (public access)
     * Trả về full detail với skills và demos
     */
    public SpecialistDetailResponse getSpecialistById(String specialistId) {
        log.info("[getSpecialistById] Getting specialist detail by ID: {}", specialistId);
        
        // Dùng SpecialistLookupService để lấy full detail (bao gồm skills và demos)
        return specialistLookupService.getSpecialistDetail(specialistId);
    }
    
    /**
     * Check xem specialist có available trong slot cụ thể không (public access)
     * Dùng để check work slots khi booking
     */
    public boolean checkSpecialistAvailability(String specialistId, String dateStr, String startTimeStr, String endTimeStr) {
        log.info("[checkSpecialistAvailability] Checking availability for specialistId={}, date={}, time={}-{}", 
            specialistId, dateStr, startTimeStr, endTimeStr);
        
        // Parse date and time
        LocalDate date = LocalDate.parse(dateStr);
        LocalTime startTime = LocalTime.parse(startTimeStr);
        LocalTime endTime = LocalTime.parse(endTimeStr);
        
        // Dùng SpecialistSlotService để check
        return specialistSlotService.isSpecialistAvailable(specialistId, date, startTime, endTime);
    }
    
    /**
     * Batch check availability cho nhiều specialists cùng lúc (tối ưu hiệu suất)
     * @param specialistIds Danh sách specialist IDs
     * @param dateStr Ngày (YYYY-MM-DD)
     * @param startTimeStr Thời gian bắt đầu (HH:mm:ss)
     * @param endTimeStr Thời gian kết thúc (HH:mm:ss)
     * @return Map với key = specialistId, value = isAvailable
     */
    public Map<String, Boolean> batchCheckAvailability(
            List<String> specialistIds, 
            String dateStr, 
            String startTimeStr, 
            String endTimeStr) {
        log.info("[batchCheckAvailability] Checking availability for {} specialists, date={}, time={}-{}", 
            specialistIds.size(), dateStr, startTimeStr, endTimeStr);
        
        // Parse date and time
        LocalDate date = LocalDate.parse(dateStr);
        LocalTime startTime = LocalTime.parse(startTimeStr);
        LocalTime endTime = LocalTime.parse(endTimeStr);
        
        // Dùng SpecialistSlotService để batch check
        return specialistSlotService.batchCheckAvailability(specialistIds, date, startTime, endTime);
    }
    
    /**
     * Batch load main demos cho nhiều specialists cùng lúc để tránh N+1 query problem
     * @param specialists Danh sách specialists cần load demos
     * @return Map với key = specialistId, value = mainDemoPreviewUrl
     */
    private Map<String, String> batchLoadMainDemos(List<Specialist> specialists) {
        if (specialists.isEmpty()) {
            return Collections.emptyMap();
        }
        
        long queryStart = System.currentTimeMillis();
        // Load tất cả main demos public cho các specialists này trong một query
        List<ArtistDemo> mainDemos = artistDemoRepository.findBySpecialistInAndIsMainDemoTrueAndIsPublicTrue(
            specialists
        );
        long queryTime = System.currentTimeMillis() - queryStart;
        
        long mapStart = System.currentTimeMillis();
        // Tạo map: specialistId -> previewUrl
        Map<String, String> result = mainDemos.stream()
            .filter(demo -> demo.getPreviewUrl() != null)
            .collect(Collectors.toMap(
                demo -> demo.getSpecialist().getSpecialistId(),
                ArtistDemo::getPreviewUrl,
                (existing, replacement) -> existing // Nếu duplicate, giữ existing
            ));
        long mapTime = System.currentTimeMillis() - mapStart;
        
        log.debug("[batchLoadMainDemos] Query took {}ms, map creation took {}ms, found {} demos", 
            queryTime, mapTime, result.size());
        
        return result;
    }
    
    /**
     * Convert Specialist entity to Map (để tránh dependency với DTO)
     * NOTE: Key names phải match với SpecialistResponse DTO để tương thích với project-service
     * @param specialist Specialist entity
     * @param mainDemoMap Map chứa mainDemoPreviewUrl đã được batch load (key = specialistId, value = previewUrl)
     */
    private Map<String, Object> toSpecialistMap(Specialist specialist, Map<String, String> mainDemoMap) {
        Map<String, Object> map = new HashMap<>();
        map.put("specialistId", specialist.getSpecialistId());
        map.put("userId", specialist.getUserId());
        map.put("fullName", specialist.getFullNameSnapshot()); // For project-service
        map.put("name", specialist.getFullNameSnapshot()); // For frontend
        map.put("email", specialist.getEmailSnapshot());
        map.put("gender", specialist.getGender());
        map.put("bio", specialist.getBio());
        map.put("avatarUrl", specialist.getAvatarUrl());
        map.put("genres", specialist.getGenres());
        map.put("recordingRoles", specialist.getRecordingRoles());
        map.put("status", specialist.getStatus());
        map.put("experienceYears", specialist.getExperienceYears());
        map.put("rating", specialist.getRating());
        map.put("totalProjects", specialist.getTotalProjects());
        map.put("reviews", specialist.getReviews());
        map.put("hourlyRate", specialist.getHourlyRate());
        
        // Lấy main demo preview URL từ map đã được batch load
        String mainDemoPreviewUrl = mainDemoMap.get(specialist.getSpecialistId());
        if (mainDemoPreviewUrl != null) {
            map.put("mainDemoPreviewUrl", mainDemoPreviewUrl);
        }
        
        return map;
    }
}

