package com.mutrapro.billing_service.repository;

import com.mutrapro.billing_service.entity.ContractInstallment;
import com.mutrapro.billing_service.enums.InstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractInstallmentRepository extends JpaRepository<ContractInstallment, String> {
    
    List<ContractInstallment> findByContractId(String contractId);
    
    List<ContractInstallment> findByContractIdAndStatus(String contractId, InstallmentStatus status);
    
    Optional<ContractInstallment> findByContractIdAndIsDepositTrueAndStatus(String contractId, InstallmentStatus status);
    
    List<ContractInstallment> findByContractIdAndIsDeposit(String contractId, Boolean isDeposit);
}

