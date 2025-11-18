package com.mutrapro.project_service.repository;

import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.enums.MilestonePaymentStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractMilestoneRepository extends JpaRepository<ContractMilestone, String> {
    
    List<ContractMilestone> findByContractIdOrderByOrderIndexAsc(String contractId);
    
    Optional<ContractMilestone> findByContractIdAndOrderIndex(String contractId, Integer orderIndex);
    
    List<ContractMilestone> findByContractIdAndPaymentStatus(String contractId, MilestonePaymentStatus paymentStatus);
    
    List<ContractMilestone> findByContractIdAndWorkStatus(String contractId, MilestoneWorkStatus workStatus);
    
    Optional<ContractMilestone> findFirstByContractIdOrderByOrderIndexAsc(String contractId);
    
    Optional<ContractMilestone> findByMilestoneIdAndContractId(String milestoneId, String contractId);
}

