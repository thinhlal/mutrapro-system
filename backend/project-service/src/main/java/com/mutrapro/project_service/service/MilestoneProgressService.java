package com.mutrapro.project_service.service;

import com.mutrapro.project_service.entity.Contract;
import com.mutrapro.project_service.entity.ContractInstallment;
import com.mutrapro.project_service.entity.ContractMilestone;
import com.mutrapro.project_service.enums.AssignmentStatus;
import com.mutrapro.project_service.enums.ContractStatus;
import com.mutrapro.project_service.enums.InstallmentStatus;
import com.mutrapro.project_service.enums.MilestoneWorkStatus;
import com.mutrapro.project_service.repository.ContractInstallmentRepository;
import com.mutrapro.project_service.repository.ContractMilestoneRepository;
import com.mutrapro.project_service.repository.ContractRepository;
import com.mutrapro.project_service.repository.TaskAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * Quản lý logic milestone actualStart dựa trên trạng thái contract, milestone và task assignments.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MilestoneProgressService {

    private final ContractRepository contractRepository;
    private final ContractMilestoneRepository contractMilestoneRepository;
    private final ContractInstallmentRepository contractInstallmentRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;

    /**
     * Kiểm tra và ghi nhận actualStartAt cho milestone nếu đủ điều kiện.
     */
    @Transactional
    public void evaluateActualStart(String contractId, String milestoneId) {
        if (contractId == null || milestoneId == null) {
            return;
        }

        Contract contract = contractRepository.findById(contractId).orElse(null);
        if (contract == null) {
            log.warn("Cannot evaluate milestone actual start. Contract not found: contractId={}, milestoneId={}",
                contractId, milestoneId);
            return;
        }

        ContractStatus contractStatus = contract.getStatus();
        if (contractStatus != ContractStatus.active) {
            return; // Chỉ xét khi contract đã active (deposit paid)
        }

        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElse(null);
        if (milestone == null) {
            log.warn("Cannot evaluate milestone actual start. Milestone not found: contractId={}, milestoneId={}",
                contractId, milestoneId);
            return;
        }

        if (milestone.getActualStartAt() != null) {
            return; // Đã ghi nhận
        }

        if (milestone.getWorkStatus() == MilestoneWorkStatus.CANCELLED) {
            return;
        }

        if (!hasAcceptedOrCompletedTask(milestoneId)) {
            return;
        }

        if (!isPreviousMilestoneReady(contractId, milestone)) {
            return;
        }

        milestone.setActualStartAt(LocalDateTime.now());
        if (milestone.getWorkStatus() == MilestoneWorkStatus.PLANNED
            || milestone.getWorkStatus() == MilestoneWorkStatus.READY_TO_START) {
            milestone.setWorkStatus(MilestoneWorkStatus.IN_PROGRESS);
        }
        contractMilestoneRepository.save(milestone);
        log.info("Milestone actual start recorded: contractId={}, milestoneId={}, actualStartAt={}",
            contractId, milestoneId, milestone.getActualStartAt());
    }

    /**
     * Ghi nhận thời điểm milestone hoàn tất thực tế.
     */
    @Transactional
    public void markActualEnd(String contractId, String milestoneId, Instant completedAt) {
        if (contractId == null || milestoneId == null) {
            return;
        }

        ContractMilestone milestone = contractMilestoneRepository
            .findByMilestoneIdAndContractId(milestoneId, contractId)
            .orElse(null);
        if (milestone == null) {
            log.warn("Cannot mark milestone actual end. Milestone not found: contractId={}, milestoneId={}",
                contractId, milestoneId);
            return;
        }

        if (milestone.getActualEndAt() != null) {
            return;
        }

        Instant effectiveInstant = completedAt != null ? completedAt : Instant.now();
        LocalDateTime endAt = LocalDateTime.ofInstant(effectiveInstant, ZoneId.systemDefault());
        milestone.setActualEndAt(endAt);
        contractMilestoneRepository.save(milestone);
        log.info("Milestone actual end recorded: contractId={}, milestoneId={}, actualEndAt={}",
            contractId, milestoneId, endAt);
    }

    private boolean hasAcceptedOrCompletedTask(String milestoneId) {
        return taskAssignmentRepository.existsByMilestoneIdAndStatusIn(
            milestoneId,
            List.of(AssignmentStatus.in_progress, AssignmentStatus.completed)
        );
    }

    private boolean isPreviousMilestoneReady(String contractId, ContractMilestone milestone) {
        Integer orderIndex = milestone.getOrderIndex();
        if (orderIndex == null || orderIndex <= 1) {
            return true;
        }

        Optional<ContractMilestone> previousOpt = contractMilestoneRepository
            .findByContractIdAndOrderIndex(contractId, orderIndex - 1);
        if (previousOpt.isEmpty()) {
            log.warn("Previous milestone not found while evaluating actual start: contractId={}, milestoneId={}",
                contractId, milestone.getMilestoneId());
            return false;
        }

        ContractMilestone previous = previousOpt.get();
        if (previous.getWorkStatus() != MilestoneWorkStatus.COMPLETED) {
            return false;
        }

        Optional<ContractInstallment> prevInstallment = contractInstallmentRepository
            .findByContractIdAndMilestoneId(contractId, previous.getMilestoneId());
        if (prevInstallment.isPresent()) {
            return prevInstallment.get().getStatus() == InstallmentStatus.PAID;
        }

        return true;
    }
}


