package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.request.AdminUpdateSkillRequest;
import com.mutrapro.specialist_service.dto.request.CreateSkillRequest;
import com.mutrapro.specialist_service.dto.response.SkillResponse;
import com.mutrapro.specialist_service.entity.Skill;
import com.mutrapro.specialist_service.exception.SkillAlreadyExistsException;
import com.mutrapro.specialist_service.exception.SkillInUseException;
import com.mutrapro.specialist_service.exception.SkillNotFoundException;
import com.mutrapro.specialist_service.mapper.SkillMapper;
import com.mutrapro.specialist_service.repository.ArtistDemoRepository;
import com.mutrapro.specialist_service.repository.SkillRepository;
import com.mutrapro.specialist_service.repository.SpecialistSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service cho Admin quản lý skills (Piano, Guitar, etc.)
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminSkillService {
    
    private final SkillRepository skillRepository;
    private final SpecialistSkillRepository specialistSkillRepository;
    private final ArtistDemoRepository artistDemoRepository;
    private final SkillMapper skillMapper;
    
    /**
     * Tạo skill mới (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SkillResponse createSkill(CreateSkillRequest request) {
        log.info("Creating skill: {}", request.getSkillName());
        
        // Kiểm tra xem skill name đã tồn tại chưa
        if (skillRepository.existsBySkillName(request.getSkillName())) {
            throw SkillAlreadyExistsException.byName(request.getSkillName());
        }
        
        Skill skill = skillMapper.toSkill(request);
        Skill saved = skillRepository.save(skill);
        
        log.info("Skill created successfully with ID: {}", saved.getSkillId());
        return skillMapper.toSkillResponse(saved);
    }
    
    /**
     * Lấy tất cả skills (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<SkillResponse> getAllSkills() {
        log.info("Getting all skills");
        List<Skill> skills = skillRepository.findAll();
        return skillMapper.toSkillResponseList(skills);
    }
    
    /**
     * Lấy skill theo ID (Admin only)
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SkillResponse getSkillById(String skillId) {
        log.info("Getting skill with ID: {}", skillId);
        Skill skill = skillRepository.findById(skillId)
            .orElseThrow(() -> SkillNotFoundException.byId(skillId));
        return skillMapper.toSkillResponse(skill);
    }
    
    /**
     * Cập nhật skill (Admin only)
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public SkillResponse updateSkill(String skillId, AdminUpdateSkillRequest request) {
        log.info("Updating skill with ID: {}", skillId);
        
        Skill skill = skillRepository.findById(skillId)
            .orElseThrow(() -> SkillNotFoundException.byId(skillId));
        
        // Kiểm tra xem skill name mới có trùng với skill khác không
        if (request.getSkillName() != null && 
            !request.getSkillName().equals(skill.getSkillName()) &&
            skillRepository.existsBySkillName(request.getSkillName())) {
            throw SkillAlreadyExistsException.byName(request.getSkillName());
        }
        
        skillMapper.updateSkillFromRequest(skill, request);
        Skill saved = skillRepository.save(skill);
        
        log.info("Skill updated successfully with ID: {}", skillId);
        return skillMapper.toSkillResponse(saved);
    }
    
    /**
     * Xóa skill (Admin only)
     * Chỉ cho phép xóa khi skill không được sử dụng bởi specialist hoặc demo nào
     */
    @Transactional
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public void deleteSkill(String skillId) {
        log.info("Deleting skill with ID: {}", skillId);
        
        Skill skill = skillRepository.findById(skillId)
            .orElseThrow(() -> SkillNotFoundException.byId(skillId));
        
        // Kiểm tra xem skill có đang được sử dụng không
        long specialistCount = specialistSkillRepository.countBySkill(skill);
        long demoCount = artistDemoRepository.countBySkill_SkillId(skillId);
        
        if (specialistCount > 0 || demoCount > 0) {
            throw SkillInUseException.create(skillId, specialistCount, demoCount);
        }
        
        // Nếu không có ai sử dụng, mới được phép xóa
        skillRepository.delete(skill);
        log.info("Skill deleted successfully with ID: {}", skillId);
    }
}

