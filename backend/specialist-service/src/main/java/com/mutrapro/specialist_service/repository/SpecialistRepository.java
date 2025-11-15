package com.mutrapro.specialist_service.repository;

import com.mutrapro.specialist_service.entity.Specialist;
import com.mutrapro.specialist_service.enums.SpecialistStatus;
import com.mutrapro.specialist_service.enums.SpecialistType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecialistRepository extends JpaRepository<Specialist, String>, JpaSpecificationExecutor<Specialist> {
    
    Optional<Specialist> findByUserId(String userId);
    
    List<Specialist> findBySpecialization(SpecialistType specialization);
    
    List<Specialist> findByStatus(SpecialistStatus status);
    
    List<Specialist> findBySpecializationAndStatus(SpecialistType specialization, SpecialistStatus status);
    
    boolean existsByUserId(String userId);
}

