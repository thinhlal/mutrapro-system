package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.ArtistDemo;
import com.mutrapro.specialist_service.entity.Specialist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArtistDemoRepository extends JpaRepository<ArtistDemo, String>, JpaSpecificationExecutor<ArtistDemo> {
    
    List<ArtistDemo> findBySpecialist(Specialist specialist);
    
    List<ArtistDemo> findBySpecialistAndIsPublicTrue(Specialist specialist);
    
    List<ArtistDemo> findByIsPublicTrue();
    
    void deleteBySpecialist(Specialist specialist);
    
    /**
     * Kiểm tra xem skill có đang được sử dụng trong demo nào không
     */
    long countBySkill_SkillId(String skillId);
}

