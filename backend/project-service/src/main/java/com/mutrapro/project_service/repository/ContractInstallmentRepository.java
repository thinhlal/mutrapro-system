package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.ContractInstallment;
import com.mutrapro.project_service.enums.InstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContractInstallmentRepository extends JpaRepository<ContractInstallment, String> {
    
    List<ContractInstallment> findByContractIdOrderByCreatedAtAsc(String contractId);
    
    List<ContractInstallment> findByContractIdAndStatus(String contractId, InstallmentStatus status);
}

