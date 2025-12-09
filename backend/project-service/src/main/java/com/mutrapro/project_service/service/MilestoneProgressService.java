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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Quản lý logic milestone actualStart dựa trên trạng thái contract, milestone
 * và task assignments.
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
        if (contractStatus != ContractStatus.active &&
                contractStatus != ContractStatus.active_pending_assignment) {
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

        // actualStartAt = thời điểm hiện tại khi milestone thực sự bắt đầu (khi
        // manager/specialist start)
        milestone.setActualStartAt(LocalDateTime.now());
        // Chỉ set IN_PROGRESS nếu milestone đang ở READY_TO_START
        // (không set nếu đang ở PLANNED, WAITING_ASSIGNMENT, WAITING_SPECIALIST_ACCEPT, 
        // hoặc TASK_ACCEPTED_WAITING_ACTIVATION vì milestone chưa được activate)
        if (milestone.getWorkStatus() == MilestoneWorkStatus.READY_TO_START) {
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
    public void markActualEnd(String contractId, String milestoneId, LocalDateTime completedAt) {
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

        LocalDateTime endAt = completedAt != null ? completedAt : LocalDateTime.now();
        milestone.setActualEndAt(endAt);
        contractMilestoneRepository.save(milestone);
        log.info("Milestone actual end recorded: contractId={}, milestoneId={}, actualEndAt={}",
                contractId, milestoneId, endAt);
    }

    private boolean hasAcceptedOrCompletedTask(String milestoneId) {
        return taskAssignmentRepository.existsByMilestoneIdAndStatusIn(
                milestoneId,
                List.of(AssignmentStatus.in_progress, AssignmentStatus.completed));
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

        // Kiểm tra milestone trước đó đã được thanh toán chưa
        // Milestone có thể ở trạng thái READY_FOR_PAYMENT hoặc COMPLETED
        // Nhưng quan trọng là installment phải PAID
        Optional<ContractInstallment> prevInstallment = contractInstallmentRepository
                .findByContractIdAndMilestoneId(contractId, previous.getMilestoneId());

        if (prevInstallment.isPresent()) {
            // Nếu có installment, phải PAID
            return prevInstallment.get().getStatus() == InstallmentStatus.PAID;
        }

        // Nếu không có installment (milestone không có payment),
        // kiểm tra work status phải READY_FOR_PAYMENT hoặc COMPLETED
        return previous.getWorkStatus() == MilestoneWorkStatus.READY_FOR_PAYMENT
                || previous.getWorkStatus() == MilestoneWorkStatus.COMPLETED;
    }
}
