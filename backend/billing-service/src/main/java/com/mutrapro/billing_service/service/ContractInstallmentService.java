package com.mutrapro.billing_service.service;

import com.mutrapro.billing_service.dto.request.CreateInstallmentsRequest;
import com.mutrapro.billing_service.dto.response.ContractInstallmentResponse;
import com.mutrapro.billing_service.entity.ContractInstallment;
import com.mutrapro.billing_service.enums.GateCondition;
import com.mutrapro.billing_service.enums.InstallmentStatus;
import com.mutrapro.billing_service.mapper.ContractInstallmentMapper;
import com.mutrapro.billing_service.repository.ContractInstallmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContractInstallmentService {

    private final ContractInstallmentRepository installmentRepository;
    private final ContractInstallmentMapper installmentMapper;

    /**
     * Tạo 2 installments (Deposit và Final) khi contract được ký
     */
    @Transactional
    public List<ContractInstallmentResponse> createInstallmentsForSignedContract(CreateInstallmentsRequest request) {
        log.info("Creating installments for contract: contractId={}, depositAmount={}, finalAmount={}", 
            request.getContractId(), request.getDepositAmount(), request.getFinalAmount());

        // Tạo Deposit installment
        ContractInstallment deposit = ContractInstallment.builder()
            .contractId(request.getContractId())
            .label("Deposit")
            .dueDate(request.getExpectedStartDate())
            .amount(request.getDepositAmount())
            .currency(request.getCurrency())
            .status(InstallmentStatus.pending)
            .isDeposit(true)
            .gateCondition(GateCondition.before_start)
            .appliedCreditAmount(BigDecimal.ZERO)
            .build();

        // Tạo Final installment
        ContractInstallment finalInstallment = ContractInstallment.builder()
            .contractId(request.getContractId())
            .label("Final")
            .dueDate(request.getDueDate())
            .amount(request.getFinalAmount())
            .currency(request.getCurrency())
            .status(InstallmentStatus.pending)
            .isDeposit(false)
            .gateCondition(GateCondition.after_delivery)
            .appliedCreditAmount(BigDecimal.ZERO)
            .build();

        List<ContractInstallment> saved = installmentRepository.saveAll(List.of(deposit, finalInstallment));
        
        log.info("Created {} installments for contract: contractId={}", saved.size(), request.getContractId());
        
        return saved.stream()
            .map(installmentMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy tất cả installments của một contract
     */
    @Transactional(readOnly = true)
    public List<ContractInstallmentResponse> getInstallmentsByContractId(String contractId) {
        log.info("Getting installments for contract: contractId={}", contractId);
        List<ContractInstallment> installments = installmentRepository.findByContractId(contractId);
        return installments.stream()
            .map(installmentMapper::toResponse)
            .collect(Collectors.toList());
    }

    /**
     * Lấy deposit installment đang pending của một contract
     */
    @Transactional(readOnly = true)
    public ContractInstallmentResponse getPendingDepositInstallment(String contractId) {
        log.info("Getting pending deposit installment for contract: contractId={}", contractId);
        ContractInstallment deposit = installmentRepository
            .findByContractIdAndIsDepositTrueAndStatus(contractId, InstallmentStatus.pending)
            .orElseThrow(() -> new RuntimeException("Deposit installment not found or already paid for contract: " + contractId));
        return installmentMapper.toResponse(deposit);
    }
}

