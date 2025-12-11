package com.mutrapro.specialist_service.service;

import com.mutrapro.specialist_service.dto.response.SkillResponse;
import com.mutrapro.specialist_service.entity.Skill;
import com.mutrapro.specialist_service.mapper.SkillMapper;
import com.mutrapro.specialist_service.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service cho public endpoints của Skills
 * Không có @PreAuthorize annotations để cho phép public access
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicSkillService {
    
    private final SkillRepository skillRepository;
    private final SkillMapper skillMapper;
    
    /**
     * Lấy tất cả skills (public access - không yêu cầu authentication)
     * Dùng cho customer khi booking để chọn skills/instruments
     */
    public List<SkillResponse> getAllSkills() {
        log.info("Getting all skills (public access)");
        List<Skill> skills = skillRepository.findAll();
        return skillMapper.toSkillResponseList(skills);
    }
}
