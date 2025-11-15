package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends JpaRepository<Skill, String>, JpaSpecificationExecutor<Skill> {
    
    Optional<Skill> findBySkillName(String skillName);
    
    List<Skill> findByIsActiveTrue();
    
    boolean existsBySkillName(String skillName);
}

