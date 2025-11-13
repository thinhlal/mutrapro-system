package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.ContractSignSession;
import com.mutrapro.project_service.enums.SignSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContractSignSessionRepository extends JpaRepository<ContractSignSession, String> {
    
    Optional<ContractSignSession> findByContractIdAndUserIdAndStatus(
        String contractId, 
        String userId, 
        SignSessionStatus status
    );
    
    Optional<ContractSignSession> findBySessionIdAndStatus(
        String sessionId, 
        SignSessionStatus status
    );
}

