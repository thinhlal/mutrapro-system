package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.ContractInstallment;
import com.mutrapro.project_service.enums.InstallmentStatus;
import com.mutrapro.project_service.enums.InstallmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractInstallmentRepository extends JpaRepository<ContractInstallment, String> {
    
    List<ContractInstallment> findByContractIdOrderByCreatedAtAsc(String contractId);
    
    List<ContractInstallment> findByContractIdAndStatus(String contractId, InstallmentStatus status);
    
    Optional<ContractInstallment> findByContractIdAndMilestoneId(String contractId, String milestoneId);
    
    Optional<ContractInstallment> findByContractIdAndType(String contractId, InstallmentType type);
}

