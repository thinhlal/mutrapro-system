package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.entity.SpecialistSkill;
import com.mutrapro.specialist_service.enums.Gender;
import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import com.mutrapro.specialist_service.exception.SpecialistNotFoundException;
import com.mutrapro.specialist_service.repository.SpecialistRepository;
import com.mutrapro.specialist_service.repository.SpecialistSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    
    /**
     * Lấy danh sách vocalists (public access)
     * Filter theo gender và genres nếu có
     */
    public List<Map<String, Object>> getVocalists(String genderStr, List<String> genres) {
        log.info("Getting vocalists: gender={}, genres={}", genderStr, genres);
        
        // Parse gender
        Gender gender = null;
        if (genderStr != null && !genderStr.isBlank()) {
            try {
                gender = Gender.valueOf(genderStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid gender: {}", genderStr);
            }
        }
        
        // Lấy tất cả recording artists với gender filter
        List<Specialist> specialists = specialistRepository.findRecordingArtists(
            SpecialistType.RECORDING_ARTIST,
            SpecialistStatus.ACTIVE,
            gender
        );
        
        // Filter theo recordingRoles (VOCALIST)
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
        
        return specialists.stream()
            .map(this::toSpecialistMap)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy danh sách specialists theo skill_id (public access)
     * Dùng để lấy instrumentalists cho booking
     */
    public List<Map<String, Object>> getSpecialistsBySkillId(String skillId) {
        log.info("Getting specialists by skillId: {}", skillId);
        
        // Lấy tất cả specialist_skills có skillId này
        List<SpecialistSkill> specialistSkills = specialistSkillRepository
            .findAll()
            .stream()
            .filter(ss -> ss.getSkill() != null && 
                skillId.equals(ss.getSkill().getSkillId()))
            .collect(Collectors.toList());
        
        if (specialistSkills.isEmpty()) {
            log.warn("No specialists found for skillId: {}", skillId);
            return Collections.emptyList();
        }
        
        // Lấy specialist IDs
        List<String> specialistIds = specialistSkills.stream()
            .map(ss -> ss.getSpecialist().getSpecialistId())
            .distinct()
            .collect(Collectors.toList());
        
        // Lấy specialists (chỉ ACTIVE)
        List<Specialist> specialists = specialistRepository.findAllById(specialistIds)
            .stream()
            .filter(s -> s.getStatus() == SpecialistStatus.ACTIVE)
            .collect(Collectors.toList());
        
        return specialists.stream()
            .map(this::toSpecialistMap)
            .collect(Collectors.toList());
    }
    
    /**
     * Lấy chi tiết specialist theo specialistId (public access)
     */
    public Map<String, Object> getSpecialistById(String specialistId) {
        log.info("Getting specialist by ID: {}", specialistId);
        
        Specialist specialist = specialistRepository.findById(specialistId)
            .orElseThrow(() -> new SpecialistNotFoundException(specialistId));
        
        return toSpecialistMap(specialist);
    }
    
    /**
     * Convert Specialist entity to Map (để tránh dependency với DTO)
     * NOTE: Key names phải match với SpecialistResponse DTO để tương thích với project-service
     */
    private Map<String, Object> toSpecialistMap(Specialist specialist) {
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
        return map;
    }
}

