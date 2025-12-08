package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.enums.Gender;
import com.mutrapro.specialist_service.enums.RecordingRole;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecialistRepository extends JpaRepository<Specialist, String>, JpaSpecificationExecutor<Specialist> {
    
    Optional<Specialist> findByUserId(String userId);
    
    List<Specialist> findBySpecialization(SpecialistType specialization);
    
    @EntityGraph(attributePaths = {"specialistSkills", "specialistSkills.skill"})
    List<Specialist> findByStatus(SpecialistStatus status);
    
    @EntityGraph(attributePaths = {"specialistSkills", "specialistSkills.skill"})
    List<Specialist> findBySpecializationAndStatus(SpecialistType specialization, SpecialistStatus status);
    
    boolean existsByUserId(String userId);
    
    /**
     * Lấy danh sách RECORDING_ARTIST specialists theo specialization, status và gender
     * Filter recordingRole sẽ được xử lý trong service layer
     */
    @Query("SELECT s FROM Specialist s " +
           "WHERE s.specialization = :specialization " +
           "AND s.status = :status " +
           "AND (:gender IS NULL OR s.gender = :gender)")
    @EntityGraph(attributePaths = {"specialistSkills", "specialistSkills.skill"})
    List<Specialist> findRecordingArtists(
        @Param("specialization") SpecialistType specialization,
        @Param("status") SpecialistStatus status,
        @Param("gender") Gender gender
    );
}

