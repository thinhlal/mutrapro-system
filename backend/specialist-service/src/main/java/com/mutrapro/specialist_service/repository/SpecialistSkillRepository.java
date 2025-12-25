package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.entity.SpecialistSkill;
import com.mutrapro.specialist_service.entity.Skill;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecialistSkillRepository extends JpaRepository<SpecialistSkill, String>, JpaSpecificationExecutor<SpecialistSkill> {
    
    @EntityGraph(attributePaths = {"skill"})
    List<SpecialistSkill> findBySpecialist(Specialist specialist);
    
    @Query("SELECT ss FROM SpecialistSkill ss JOIN FETCH ss.skill WHERE ss.specialist = :specialist")
    List<SpecialistSkill> findBySpecialistWithSkill(@Param("specialist") Specialist specialist);
    
    Optional<SpecialistSkill> findBySpecialistAndSkill(Specialist specialist, Skill skill);
    
    boolean existsBySpecialistAndSkill(Specialist specialist, Skill skill);
    
    void deleteBySpecialist(Specialist specialist);
    
    /**
     * Kiểm tra xem skill có đang được sử dụng bởi specialist nào không
     */
    boolean existsBySkill(Skill skill);

    long countBySkill(Skill skill);
    
    /**
     * Đếm số specialist sử dụng mỗi skill (để tìm top demanded)
     * Returns list of Object arrays where [0] = skillId, [1] = count
     */
    @Query("SELECT ss.skill.skillId, COUNT(DISTINCT ss.specialist) " +
           "FROM SpecialistSkill ss " +
           "WHERE ss.specialist.status = com.mutrapro.specialist_service.enums.SpecialistStatus.ACTIVE " +
           "GROUP BY ss.skill.skillId " +
           "ORDER BY COUNT(DISTINCT ss.specialist) DESC")
    List<Object[]> countSpecialistsBySkill();
}

