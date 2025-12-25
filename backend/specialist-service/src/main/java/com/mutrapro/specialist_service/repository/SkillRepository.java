package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.Skill;
import com.mutrapro.specialist_service.enums.RecordingCategory;
import com.mutrapro.specialist_service.enums.SkillType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String>, JpaSpecificationExecutor<Skill> {
    
    Optional<Skill> findBySkillName(String skillName);
    
    List<Skill> findByIsActiveTrue();
    
    // Optimized count query for statistics (avoid loading all records into memory)
    long countByIsActiveTrue();
    
    List<Skill> findBySkillTypeAndIsActiveTrue(SkillType skillType);
    
    List<Skill> findBySkillTypeAndRecordingCategoryAndIsActiveTrue(SkillType skillType, RecordingCategory recordingCategory);
    
    boolean existsBySkillName(String skillName);
}

