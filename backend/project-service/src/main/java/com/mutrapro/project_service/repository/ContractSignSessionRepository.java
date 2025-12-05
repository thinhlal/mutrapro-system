package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.ContractSignSession;
import com.mutrapro.project_service.enums.SignSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
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

    @Query("SELECT s FROM ContractSignSession s WHERE s.status = :status AND s.expireAt < :cutoff")
    List<ContractSignSession> findByStatusAndExpireAtBefore(
            @Param("status") SignSessionStatus status,
            @Param("cutoff") LocalDateTime cutoff
    );

    @Modifying
    @Query("DELETE FROM ContractSignSession s WHERE s.status = :status AND s.expireAt < :cutoff")
    int deleteByStatusAndExpireAtBefore(
            @Param("status") SignSessionStatus status,
            @Param("cutoff") LocalDateTime cutoff
    );
}

