package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.Studio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudioRepository extends JpaRepository<Studio, String> {
    
    List<Studio> findByIsActiveTrue();
    
    Optional<Studio> findByStudioIdAndIsActiveTrue(String studioId);
}
