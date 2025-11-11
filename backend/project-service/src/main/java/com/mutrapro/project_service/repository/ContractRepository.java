package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.enums.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, UUID> {
    
    Optional<Contract> findByContractNumber(String contractNumber);
    
    List<Contract> findByRequestId(String requestId);
    
    List<Contract> findByUserId(String userId);
    
    List<Contract> findByManagerUserId(String managerUserId);
    
    List<Contract> findByStatus(ContractStatus status);
    
    @Query("SELECT c FROM Contract c WHERE c.requestId = :requestId AND c.status = :status")
    List<Contract> findByRequestIdAndStatus(@Param("requestId") String requestId, @Param("status") ContractStatus status);
    
    boolean existsByRequestId(String requestId);
}

