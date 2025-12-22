package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.ArtistDemo;
import com.mutrapro.specialist_service.entity.Specialist;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArtistDemoRepository extends JpaRepository<ArtistDemo, String>, JpaSpecificationExecutor<ArtistDemo> {
    
    @EntityGraph(attributePaths = {"skill"})
    List<ArtistDemo> findBySpecialist(Specialist specialist);
    
    @Query("SELECT ad FROM ArtistDemo ad LEFT JOIN FETCH ad.skill WHERE ad.specialist = :specialist AND ad.isPublic = true")
    List<ArtistDemo> findBySpecialistAndIsPublicTrue(@Param("specialist") Specialist specialist);
    
    @EntityGraph(attributePaths = {"skill"})
    List<ArtistDemo> findByIsPublicTrue();
    
    void deleteBySpecialist(Specialist specialist);
    
    /**
     * Kiểm tra xem skill có đang được sử dụng trong demo nào không
     */
    long countBySkill_SkillId(String skillId);
    
    /**
     * Tìm main demo của specialist (demo được đánh dấu là demo chính)
     */
    @Query("SELECT ad FROM ArtistDemo ad LEFT JOIN FETCH ad.skill WHERE ad.specialist = :specialist AND ad.isMainDemo = true")
    ArtistDemo findMainDemoBySpecialist(@Param("specialist") Specialist specialist);
    
    /**
     * Tìm tất cả main demos của specialist (nên chỉ có 1, nhưng để an toàn)
     */
    List<ArtistDemo> findBySpecialistAndIsMainDemoTrue(Specialist specialist);
    
    /**
     * Batch load main demos public cho nhiều specialists cùng lúc (tối ưu hiệu suất)
     * @param specialists Danh sách specialists
     * @return Danh sách main demos public
     */
    @Query("SELECT ad FROM ArtistDemo ad WHERE ad.specialist IN :specialists AND ad.isMainDemo = true AND ad.isPublic = true")
    List<ArtistDemo> findBySpecialistInAndIsMainDemoTrueAndIsPublicTrue(@Param("specialists") List<Specialist> specialists);
}

