package com.mutrapro.billing_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.billing_service.dto.request.AdjustWalletBalanceRequest;
import com.mutrapro.billing_service.dto.request.PayDepositRequest;
import com.mutrapro.billing_service.dto.request.PayMilestoneRequest;
import com.mutrapro.billing_service.dto.request.PayRevisionFeeRequest;
import com.mutrapro.billing_service.dto.request.TopupWalletRequest;
import com.mutrapro.billing_service.dto.request.WithdrawWalletRequest;
import com.mutrapro.billing_service.client.ProjectServiceFeignClient;
import com.mutrapro.billing_service.dto.response.MilestonePaymentQuoteResponse;
import com.mutrapro.billing_service.dto.response.RevenueStatisticsResponse;
import com.mutrapro.billing_service.dto.response.TopupVolumeByDateResponse;
import com.mutrapro.billing_service.dto.response.WalletDashboardStatisticsResponse;
import com.mutrapro.billing_service.dto.response.WalletResponse;
import com.mutrapro.billing_service.dto.response.WalletStatisticsResponse;
import com.mutrapro.billing_service.dto.response.WalletTransactionResponse;
import com.mutrapro.billing_service.dto.response.WithdrawalRequestResponse;
import com.mutrapro.billing_service.entity.OutboxEvent;
import com.mutrapro.billing_service.entity.Wallet;
import com.mutrapro.billing_service.entity.WalletTransaction;
import com.mutrapro.billing_service.repository.OutboxEventRepository;
import com.mutrapro.shared.event.DepositPaidEvent;
import com.mutrapro.shared.event.MilestonePaidEvent;
import com.mutrapro.shared.event.RevisionFeePaidEvent;
import com.mutrapro.shared.event.RevisionFeeRefundedEvent;
import com.mutrapro.billing_service.enums.CurrencyType;
import com.mutrapro.billing_service.enums.WalletTxType;
import com.mutrapro.billing_service.enums.WithdrawalStatus;
import com.mutrapro.billing_service.entity.WithdrawalRequest;
import com.mutrapro.shared.service.S3Service;
import org.springframework.web.multipart.MultipartFile;
import com.mutrapro.billing_service.exception.CurrencyMismatchException;
import com.mutrapro.billing_service.exception.InsufficientBalanceException;
import com.mutrapro.billing_service.exception.InvalidAdjustmentAmountException;
import com.mutrapro.billing_service.exception.InvalidAmountException;
import com.mutrapro.billing_service.exception.InvalidProofFileException;
import com.mutrapro.billing_service.exception.InvalidTransactionTypeException;
import com.mutrapro.billing_service.exception.InvalidWithdrawalStatusException;
import com.mutrapro.billing_service.exception.ProofFileDownloadException;
import com.mutrapro.billing_service.exception.ProofFileUploadException;
import com.mutrapro.billing_service.exception.TransactionAlreadyRefundedException;
import com.mutrapro.billing_service.exception.UnauthorizedWalletAccessException;
import com.mutrapro.billing_service.exception.UserNotAuthenticatedException;
import com.mutrapro.billing_service.exception.WalletNotFoundException;
import com.mutrapro.billing_service.exception.WithdrawalRequestNotFoundException;
import com.mutrapro.billing_service.mapper.WalletMapper;
import com.mutrapro.billing_service.repository.WalletRepository;
import com.mutrapro.billing_service.repository.WalletTransactionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class WalletService {

    WalletRepository walletRepository;
    WalletTransactionRepository walletTransactionRepository;
    WalletMapper walletMapper;
    OutboxEventRepository outboxEventRepository;
    ObjectMapper objectMapper;
    ProjectServiceFeignClient projectServiceFeignClient;
    com.mutrapro.billing_service.repository.WithdrawalRequestRepository withdrawalRequestRepository;
    S3Service s3Service;

    /**
     * Lấy hoặc tạo wallet cho user hiện tại
     */
    @Transactional
    public WalletResponse getOrCreateWallet() {
        String userId = getCurrentUserId();

        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseGet(() -> {
                    log.info("Creating new wallet for user: {}", userId);
                    Wallet newWallet = Wallet.builder()
                            .userId(userId)
                            .balance(BigDecimal.ZERO)
                            .currency(CurrencyType.VND)
                            .build();
                    return walletRepository.save(newWallet);
                });

        return walletMapper.toResponse(wallet);
    }

    /**
     * Lấy wallet theo ID (chỉ owner mới được truy cập)
     */
    @Transactional(readOnly = true)
    public WalletResponse getWalletById(String walletId) {
        String userId = getCurrentUserId();

        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Kiểm tra quyền truy cập
        if (!wallet.getUserId().equals(userId)) {
            throw UnauthorizedWalletAccessException.create(walletId);
        }

        return walletMapper.toResponse(wallet);
    }

    /**
     * Lấy wallet của user hiện tại
     */
    @Transactional(readOnly = true)
    public WalletResponse getMyWallet() {
        String userId = getCurrentUserId();

        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> WalletNotFoundException.byUserId(userId));

        return walletMapper.toResponse(wallet);
    }

    /**
     * Nạp tiền vào ví
     */
    @Transactional
    public WalletTransactionResponse topupWallet(String walletId, TopupWalletRequest request) {
        String userId = getCurrentUserId();

        // Lấy wallet với lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Kiểm tra quyền truy cập
        if (!wallet.getUserId().equals(userId)) {
            throw UnauthorizedWalletAccessException.create(walletId);
        }

        // Validate amount
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw InvalidAmountException.forTopup(request.getAmount());
        }

        // Validate currency
        CurrencyType currency = request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND;
        if (!wallet.getCurrency().equals(currency)) {
            throw CurrencyMismatchException.create(wallet.getCurrency(), currency);
        }

        // Tính toán số dư mới
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.add(request.getAmount());

        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        walletRepository.save(wallet);

        // Tạo transaction record
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("topup_amount", request.getAmount().toString());
        metadata.put("currency", currency.name());
        
        // Lưu thông tin payment method và gateway (nếu có)
        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            metadata.put("payment_method", request.getPaymentMethod());
        }
        if (request.getTransactionId() != null && !request.getTransactionId().isBlank()) {
            metadata.put("transaction_id", request.getTransactionId());
        }
        if (request.getGatewayResponse() != null && !request.getGatewayResponse().isBlank()) {
            metadata.put("gateway_response", request.getGatewayResponse());
        }

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.topup)
                .amount(request.getAmount())
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .createdAt(LocalDateTime.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        log.info("Topup wallet: walletId={}, amount={}, balanceBefore={}, balanceAfter={}",
                walletId, request.getAmount(), balanceBefore, balanceAfter);

        return walletMapper.toResponse(savedTransaction);
    }

    /**
     * Nạp tiền vào ví từ payment gateway (webhook callback) - không cần authentication
     * Method này được gọi từ SePayService khi xử lý webhook callback
     */
    @Transactional
    public WalletTransactionResponse topupWalletFromPayment(String walletId, TopupWalletRequest request) {
        // Lấy wallet với lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Validate amount
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw InvalidAmountException.forTopup(request.getAmount());
        }

        // Validate currency
        CurrencyType currency = request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND;
        if (!wallet.getCurrency().equals(currency)) {
            throw CurrencyMismatchException.create(wallet.getCurrency(), currency);
        }

        // Tính toán số dư mới
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.add(request.getAmount());

        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        walletRepository.save(wallet);

        // Tạo transaction record
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("topup_amount", request.getAmount().toString());
        metadata.put("currency", currency.name());
        
        // Lưu thông tin payment method và gateway (nếu có)
        if (request.getPaymentMethod() != null && !request.getPaymentMethod().isBlank()) {
            metadata.put("payment_method", request.getPaymentMethod());
        }
        if (request.getTransactionId() != null && !request.getTransactionId().isBlank()) {
            metadata.put("transaction_id", request.getTransactionId());
        }
        if (request.getPaymentOrderId() != null && !request.getPaymentOrderId().isBlank()) {
            metadata.put("payment_order_id", request.getPaymentOrderId());
        }
        if (request.getGatewayResponse() != null && !request.getGatewayResponse().isBlank()) {
            metadata.put("gateway_response", request.getGatewayResponse());
        }

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.topup)
                .amount(request.getAmount())
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .createdAt(LocalDateTime.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        log.info("Topup wallet from payment gateway: walletId={}, userId={}, amount={}, balanceBefore={}, balanceAfter={}",
                walletId, wallet.getUserId(), request.getAmount(), balanceBefore, balanceAfter);

        return walletMapper.toResponse(savedTransaction);
    }

    /**
     * Thanh toán DEPOSIT
     */
    @Transactional
    public WalletTransactionResponse payDeposit(String walletId, PayDepositRequest request) {
        String userId = getCurrentUserId();

        // Lấy wallet với lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Kiểm tra quyền truy cập
        if (!wallet.getUserId().equals(userId)) {
            throw UnauthorizedWalletAccessException.create(walletId);
        }

        // Validate amount
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw InvalidAmountException.forDebit(request.getAmount());
        }

        // Kiểm tra số dư khả dụng (available = balance - holdBalance)
        BigDecimal availableBalance = wallet.getAvailableBalance();
        if (availableBalance.compareTo(request.getAmount()) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, availableBalance, request.getAmount());
        }

        // Validate currency
        CurrencyType currency = request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND;
        if (!wallet.getCurrency().equals(currency)) {
            throw CurrencyMismatchException.create(wallet.getCurrency(), currency);
        }

        // Tính toán số dư mới
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.subtract(request.getAmount());

        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        walletRepository.save(wallet);

        // Tạo transaction record
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("debit_amount", request.getAmount().toString());
        metadata.put("currency", currency.name());
        metadata.put("payment_method", "wallet");
        metadata.put("installment_id", request.getInstallmentId());
        metadata.put("payment_type", "DEPOSIT");

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.contract_deposit_payment)
                .amount(request.getAmount())
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .contractId(request.getContractId())
                .createdAt(LocalDateTime.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Gửi DepositPaidEvent cho DEPOSIT
        try {
            LocalDateTime paidAt = LocalDateTime.now();
            
            UUID eventId = UUID.randomUUID();
            DepositPaidEvent event = DepositPaidEvent.builder()
                .eventId(eventId)
                .contractId(request.getContractId())
                .installmentId(request.getInstallmentId())
                .paidAt(paidAt)
                .amount(request.getAmount())
                .currency(currency.name())
                .timestamp(LocalDateTime.now())
                .build();
            
            JsonNode payload = objectMapper.valueToTree(event);
            OutboxEvent saved = saveOutboxEvent(
                request.getContractId(),
                "Contract",
                "billing.deposit.paid",
                payload
            );
            
            log.info("✅ Queued DepositPaidEvent in outbox: outboxId={}, eventId={}, contractId={}, installmentId={}, paidAt={}",
                saved.getOutboxId(), eventId, request.getContractId(), request.getInstallmentId(), paidAt);
        } catch (Exception e) {
            log.error("❌ Failed to enqueue DepositPaidEvent: contractId={}, error={}",
                request.getContractId(), e.getMessage(), e);
            // Không throw exception - transaction đã được tạo thành công
        }

        log.info("Pay deposit: walletId={}, contractId={}, amount={}, balanceBefore={}, balanceAfter={}",
                walletId, request.getContractId(), request.getAmount(), balanceBefore, balanceAfter);

        return walletMapper.toResponse(savedTransaction);
    }

    /**
     * Thanh toán Milestone
     */
    @Transactional
    public WalletTransactionResponse payMilestone(String walletId, PayMilestoneRequest request) {
        String userId = getCurrentUserId();

        MilestonePaymentQuoteResponse quote = null;
        try {
            var quoteResp = projectServiceFeignClient.getMilestonePaymentQuote(
                request.getContractId(),
                request.getMilestoneId()
            );
            quote = quoteResp != null ? quoteResp.getData() : null;
        } catch (Exception e) {
            log.error("Failed to fetch milestone payment quote (strict mode): contractId={}, milestoneId={}, error={}, cause={}",
                request.getContractId(), request.getMilestoneId(), e.getMessage(), 
                e.getCause() != null ? e.getCause().getMessage() : "N/A", e);
        }

        if (quote != null && quote.getInstallmentId() != null && request.getInstallmentId() != null
            && !quote.getInstallmentId().equals(request.getInstallmentId())) {
            throw new IllegalArgumentException("InstallmentId mismatch for milestone payment");
        }

        // Strict mode: never trust FE-provided amount. Must charge the authoritative payableAmount from project-service.
        if (quote == null || quote.getPayableAmount() == null || quote.getPayableAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Unable to resolve payable amount for this milestone. Please try again later.");
        }
        BigDecimal amountToPay = quote.getPayableAmount();

        // Lấy wallet với lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Kiểm tra quyền truy cập
        if (!wallet.getUserId().equals(userId)) {
            throw UnauthorizedWalletAccessException.create(walletId);
        }

        // Ignore request.amount entirely (amount is computed from quote).

        // Kiểm tra số dư khả dụng (available = balance - holdBalance)
        BigDecimal availableBalance = wallet.getAvailableBalance();
        if (availableBalance.compareTo(amountToPay) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, availableBalance, amountToPay);
        }

        // Validate currency
        CurrencyType currency = request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND;
        if (!wallet.getCurrency().equals(currency)) {
            throw CurrencyMismatchException.create(wallet.getCurrency(), currency);
        }

        // Tính toán số dư mới
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.subtract(amountToPay);

        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        walletRepository.save(wallet);

        // Tạo transaction record
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("debit_amount", amountToPay.toString());
        metadata.put("currency", currency.name());
        metadata.put("payment_method", "wallet");
        metadata.put("installment_id", request.getInstallmentId());
        metadata.put("payment_type", "MILESTONE");
        if (quote != null) {
            if (quote.getBaseAmount() != null) metadata.put("base_amount", quote.getBaseAmount().toString());
            if (quote.getLateDiscountPercent() != null) metadata.put("late_discount_percent", quote.getLateDiscountPercent().toString());
            if (quote.getLateDiscountAmount() != null) metadata.put("late_discount_amount", quote.getLateDiscountAmount().toString());
            if (quote.getLateHours() != null) metadata.put("late_hours", quote.getLateHours().toString());
            if (quote.getGraceHours() != null) metadata.put("grace_hours", quote.getGraceHours().toString());
            if (quote.getPolicyVersion() != null) metadata.put("discount_policy_version", quote.getPolicyVersion());
        }

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.milestone_payment)
                .amount(amountToPay)
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .contractId(request.getContractId())
                .milestoneId(request.getMilestoneId())
                .createdAt(LocalDateTime.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Gửi MilestonePaidEvent cho milestone payment
        try {
            LocalDateTime paidAt = LocalDateTime.now();
            
            UUID eventId = UUID.randomUUID();

            String discountReason = null;
            if (quote != null && quote.getLateDiscountAmount() != null
                && quote.getLateDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
                discountReason = "LATE_DELIVERY";
            }

            MilestonePaidEvent event = MilestonePaidEvent.builder()
                .eventId(eventId)
                .contractId(request.getContractId())
                .milestoneId(request.getMilestoneId())
                .orderIndex(request.getOrderIndex())
                .paidAt(paidAt)
                .amount(amountToPay)
                .currency(currency.name())
                .timestamp(LocalDateTime.now())
                .baseAmount(quote != null ? quote.getBaseAmount() : null)
                .lateDiscountPercent(quote != null ? quote.getLateDiscountPercent() : null)
                .lateDiscountAmount(quote != null ? quote.getLateDiscountAmount() : null)
                .lateHours(quote != null ? quote.getLateHours() : null)
                .graceHours(quote != null ? quote.getGraceHours() : null)
                .discountReason(discountReason)
                .discountPolicyVersion(quote != null ? quote.getPolicyVersion() : null)
                .build();
            
            JsonNode payload = objectMapper.valueToTree(event);
            OutboxEvent saved = saveOutboxEvent(
                request.getContractId(),
                "ContractMilestone",
                "billing.milestone.paid",
                payload
            );
            
            log.info("✅ Queued Milestone MilestonePaidEvent in outbox: outboxId={}, eventId={}, contractId={}, milestoneId={}, orderIndex={}, paidAt={}",
                saved.getOutboxId(), eventId, request.getContractId(), 
                request.getMilestoneId(), request.getOrderIndex(), paidAt);
        } catch (Exception e) {
            log.error("❌ Failed to enqueue Milestone MilestonePaidEvent: contractId={}, milestoneId={}, error={}",
                request.getContractId(), request.getMilestoneId(), e.getMessage(), e);
            // Không throw exception - transaction đã được tạo thành công
        }

        log.info("Pay milestone: walletId={}, contractId={}, milestoneId={}, amount={}, balanceBefore={}, balanceAfter={}",
                walletId, request.getContractId(), request.getMilestoneId(), amountToPay, balanceBefore, balanceAfter);

        return walletMapper.toResponse(savedTransaction);
    }

    /**
     * Thanh toán Revision Fee
     */
    @Transactional
    public WalletTransactionResponse payRevisionFee(String walletId, PayRevisionFeeRequest request) {
        String userId = getCurrentUserId();

        // Lấy wallet với lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Kiểm tra quyền truy cập
        if (!wallet.getUserId().equals(userId)) {
            throw UnauthorizedWalletAccessException.create(walletId);
        }

        // Validate amount
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw InvalidAmountException.forDebit(request.getAmount());
        }

        // Kiểm tra số dư khả dụng (available = balance - holdBalance)
        BigDecimal availableBalance = wallet.getAvailableBalance();
        if (availableBalance.compareTo(request.getAmount()) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, availableBalance, request.getAmount());
        }

        // Validate currency
        CurrencyType currency = request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND;
        if (!wallet.getCurrency().equals(currency)) {
            throw CurrencyMismatchException.create(wallet.getCurrency(), currency);
        }

        // Tính toán số dư mới
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.subtract(request.getAmount());

        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        walletRepository.save(wallet);

        // Tạo transaction record
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("debit_amount", request.getAmount().toString());
        metadata.put("currency", currency.name());
        metadata.put("payment_method", "wallet");
        metadata.put("reason", "PAID_REVISION");
        if (request.getSubmissionId() != null) {
            metadata.put("originalSubmissionId", request.getSubmissionId());
        }
        if (request.getRevisionRound() != null) {
            metadata.put("revisionRound", request.getRevisionRound().toString());
        }
        if (request.getRequestedByUserId() != null) {
            metadata.put("requestedByUserId", request.getRequestedByUserId());
        }

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.revision_fee)
                .amount(request.getAmount())
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .contractId(request.getContractId())
                .milestoneId(request.getMilestoneId())
                .submissionId(request.getSubmissionId())
                .createdAt(LocalDateTime.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Gửi RevisionFeePaidEvent cho revision fee payment
        try {
            LocalDateTime paidAt = LocalDateTime.now();
            
            UUID eventId = UUID.randomUUID();
            RevisionFeePaidEvent event = RevisionFeePaidEvent.builder()
                .eventId(eventId)
                .walletTxId(savedTransaction.getWalletTxId())
                .walletId(walletId)
                .customerUserId(userId)
                .contractId(request.getContractId())
                .milestoneId(request.getMilestoneId())
                .taskAssignmentId(request.getTaskAssignmentId())  // Lấy từ request
                .submissionId(request.getSubmissionId())
                .revisionRound(request.getRevisionRound())
                .amount(request.getAmount())
                .currency(currency.name())
                .title(request.getTitle())
                .description(request.getDescription())
                .paidAt(paidAt)
                .timestamp(LocalDateTime.now())
                .build();
            
            JsonNode payload = objectMapper.valueToTree(event);
            OutboxEvent saved = saveOutboxEvent(
                request.getContractId(),
                "RevisionRequest",
                "billing.revision.fee.paid",
                payload
            );
            
            log.info("✅ Queued RevisionFeePaidEvent in outbox: outboxId={}, eventId={}, walletTxId={}, contractId={}, submissionId={}, paidAt={}",
                saved.getOutboxId(), eventId, savedTransaction.getWalletTxId(), request.getContractId(), 
                request.getSubmissionId(), paidAt);
        } catch (Exception e) {
            log.error("❌ Failed to enqueue RevisionFeePaidEvent: walletTxId={}, contractId={}, error={}",
                savedTransaction.getWalletTxId(), request.getContractId(), e.getMessage(), e);
            // Không throw exception - transaction đã được tạo thành công
        }

        log.info("Pay revision fee: walletId={}, contractId={}, milestoneId={}, submissionId={}, amount={}, balanceBefore={}, balanceAfter={}",
                walletId, request.getContractId(), request.getMilestoneId(), request.getSubmissionId(), 
                request.getAmount(), balanceBefore, balanceAfter);

        return walletMapper.toResponse(savedTransaction);
    }

    /**
     * Tạo yêu cầu rút tiền từ ví (status PENDING, chờ manager duyệt)
     */
    @Transactional
    public WithdrawalRequestResponse withdrawWallet(String walletId, WithdrawWalletRequest request) {
        String userId = getCurrentUserId();

        // Lấy wallet (không cần lock vì chưa trừ tiền)
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Kiểm tra quyền truy cập
        if (!wallet.getUserId().equals(userId)) {
            throw UnauthorizedWalletAccessException.create(walletId);
        }

        // Validate amount
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw InvalidAmountException.forDebit(request.getAmount());
        }

        // Kiểm tra số dư khả dụng (available = balance - holdBalance)
        BigDecimal availableBalance = wallet.getAvailableBalance();
        if (availableBalance.compareTo(request.getAmount()) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, availableBalance, request.getAmount());
        }

        // Validate currency
        CurrencyType currency = request.getCurrency() != null ? request.getCurrency() : CurrencyType.VND;
        if (!wallet.getCurrency().equals(currency)) {
            throw CurrencyMismatchException.create(wallet.getCurrency(), currency);
        }

        // Lock wallet để tránh race condition
        Wallet lockedWallet = walletRepository.findByIdWithLock(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Double check available balance sau khi lock
        BigDecimal lockedAvailableBalance = lockedWallet.getAvailableBalance();
        if (lockedAvailableBalance.compareTo(request.getAmount()) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, lockedAvailableBalance, request.getAmount());
        }

        // Hold tiền ngay (available → hold)
        BigDecimal newHoldBalance = lockedWallet.getHoldBalance().add(request.getAmount());
        lockedWallet.setHoldBalance(newHoldBalance);
        walletRepository.save(lockedWallet);

        // Tạo withdrawal request với status PENDING_REVIEW
        WithdrawalRequest withdrawalRequest = WithdrawalRequest.builder()
                .wallet(lockedWallet)
                .amount(request.getAmount())
                .currency(currency)
                .bankAccountNumber(request.getBankAccountNumber())
                .bankName(request.getBankName())
                .accountHolderName(request.getAccountHolderName())
                .note(request.getNote())
                .status(WithdrawalStatus.PENDING_REVIEW)
                .createdAt(LocalDateTime.now())
                .build();

        WithdrawalRequest savedRequest = withdrawalRequestRepository.save(withdrawalRequest);

        log.info("Created withdrawal request: requestId={}, walletId={}, amount={}, bankAccount={}, bankName={}",
                savedRequest.getWithdrawalRequestId(), walletId, request.getAmount(), 
                request.getBankAccountNumber(), request.getBankName());

        return toWithdrawalRequestResponse(savedRequest);
    }

    /**
     * Manager/Admin duyệt yêu cầu rút tiền (tiền vẫn hold, chờ admin/manager chuyển tiền)
     */
    @Transactional
    public WithdrawalRequestResponse approveWithdrawal(String withdrawalRequestId, String adminNote) {
        String adminUserId = getCurrentUserId();

        // Lấy withdrawal request
        WithdrawalRequest request = withdrawalRequestRepository.findById(withdrawalRequestId)
                .orElseThrow(() -> WithdrawalRequestNotFoundException.byId(withdrawalRequestId));

        // Kiểm tra status
        if (request.getStatus() != WithdrawalStatus.PENDING_REVIEW) {
            throw InvalidWithdrawalStatusException.forOperation(
                withdrawalRequestId, request.getStatus(), WithdrawalStatus.PENDING_REVIEW);
        }

        // Update withdrawal request: PENDING_REVIEW → APPROVED (tiền vẫn hold)
        request.setStatus(WithdrawalStatus.APPROVED);
        request.setApprovedBy(adminUserId);
        request.setApprovedAt(LocalDateTime.now());
        request.setAdminNote(adminNote);
        withdrawalRequestRepository.save(request);

        log.info("Approved withdrawal request: requestId={}, walletId={}, amount={}, approvedBy={} (money still on hold, waiting for admin/manager to transfer)",
                withdrawalRequestId, request.getWallet().getWalletId(), request.getAmount(), adminUserId);

        return toWithdrawalRequestResponse(request);
    }

    /**
     * Manager/Admin từ chối yêu cầu rút tiền → Release hold về available
     */
    @Transactional
    public WithdrawalRequestResponse rejectWithdrawal(String withdrawalRequestId, String rejectionReason, String adminNote) {
        String adminUserId = getCurrentUserId();

        // Lấy withdrawal request
        WithdrawalRequest request = withdrawalRequestRepository.findById(withdrawalRequestId)
                .orElseThrow(() -> WithdrawalRequestNotFoundException.byId(withdrawalRequestId));

        // Kiểm tra status
        if (request.getStatus() != WithdrawalStatus.PENDING_REVIEW) {
            throw InvalidWithdrawalStatusException.forOperation(
                withdrawalRequestId, request.getStatus(), WithdrawalStatus.PENDING_REVIEW);
        }

        // Lấy wallet với lock để release hold
        Wallet wallet = walletRepository.findByIdWithLock(request.getWallet().getWalletId())
                .orElseThrow(() -> WalletNotFoundException.byId(request.getWallet().getWalletId()));

        // Release hold về available (hold → available)
        BigDecimal newHoldBalance = wallet.getHoldBalance().subtract(request.getAmount());
        if (newHoldBalance.compareTo(BigDecimal.ZERO) < 0) {
            log.warn("Hold balance would be negative, setting to 0: walletId={}, currentHold={}, amount={}",
                    wallet.getWalletId(), wallet.getHoldBalance(), request.getAmount());
            newHoldBalance = BigDecimal.ZERO;
        }
        wallet.setHoldBalance(newHoldBalance);
        walletRepository.save(wallet);

        // Update withdrawal request
        request.setStatus(WithdrawalStatus.REJECTED);
        request.setRejectedBy(adminUserId);
        request.setRejectedAt(LocalDateTime.now());
        request.setRejectionReason(rejectionReason);
        request.setAdminNote(adminNote);
        withdrawalRequestRepository.save(request);

        log.info("Rejected withdrawal request: requestId={}, walletId={}, amount={}, rejectedBy={}, reason={} (hold released)",
                withdrawalRequestId, wallet.getWalletId(), request.getAmount(), adminUserId, rejectionReason);

        return toWithdrawalRequestResponse(request);
    }

    /**
     * Admin/Manager hoàn thành chuyển tiền (nhập thông tin chuyển tiền, trừ tiền từ hold, tạo transaction)
     */
    @Transactional
    public WalletTransactionResponse completeWithdrawal(
            String withdrawalRequestId,
            BigDecimal paidAmount,
            String provider,
            String bankRef,
            String txnCode,
            MultipartFile proofFile) {
        String adminUserId = getCurrentUserId();

        // Lấy withdrawal request
        WithdrawalRequest request = withdrawalRequestRepository.findById(withdrawalRequestId)
                .orElseThrow(() -> WithdrawalRequestNotFoundException.byId(withdrawalRequestId));

        // Kiểm tra status
        if (request.getStatus() != WithdrawalStatus.APPROVED && request.getStatus() != WithdrawalStatus.PROCESSING) {
            throw InvalidWithdrawalStatusException.forOperation(
                withdrawalRequestId, request.getStatus(), WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING);
        }

        // Lấy wallet với lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(request.getWallet().getWalletId())
                .orElseThrow(() -> WalletNotFoundException.byId(request.getWallet().getWalletId()));

        // Kiểm tra hold balance
        if (wallet.getHoldBalance().compareTo(request.getAmount()) < 0) {
            log.warn("Hold balance is less than request amount: walletId={}, holdBalance={}, amount={}",
                    wallet.getWalletId(), wallet.getHoldBalance(), request.getAmount());
        }

        // Upload proof file to S3 private folder (nếu có)
        String proofS3Key = null;
        if (proofFile != null && !proofFile.isEmpty()) {
            log.info("Processing proof file: requestId={}, fileName={}, contentType={}, size={}", 
                withdrawalRequestId, proofFile.getOriginalFilename(), proofFile.getContentType(), proofFile.getSize());
            try {
                // Validate file type (cho phép image và PDF)
                String contentType = proofFile.getContentType();
                String fileName = proofFile.getOriginalFilename() != null ? proofFile.getOriginalFilename().toLowerCase() : "";
                boolean isValidType = (contentType != null && (contentType.startsWith("image/") || contentType.equals("application/pdf"))) ||
                                     fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || 
                                     fileName.endsWith(".png") || fileName.endsWith(".pdf");
                
                if (!isValidType) {
                    log.error("Invalid proof file type: requestId={}, contentType={}, fileName={}", 
                        withdrawalRequestId, contentType, fileName);
                    throw InvalidProofFileException.invalidType(fileName, contentType);
                }

                // Validate file size (max 10MB)
                long maxSize = 10 * 1024 * 1024; // 10MB
                if (proofFile.getSize() > maxSize) {
                    log.error("Proof file size exceeds limit: requestId={}, size={}, maxSize={}", 
                        withdrawalRequestId, proofFile.getSize(), maxSize);
                    throw InvalidProofFileException.exceedsSizeLimit(fileName, proofFile.getSize(), maxSize);
                }

                // Upload to S3 private folder (không public, cần authentication để download)
                log.info("Uploading proof file to S3: requestId={}, fileName={}, contentType={}, size={}", 
                    withdrawalRequestId, proofFile.getOriginalFilename(), contentType, proofFile.getSize());
                proofS3Key = s3Service.uploadFileAndReturnKey(
                        proofFile.getInputStream(),
                        proofFile.getOriginalFilename(),
                        proofFile.getContentType(),
                        proofFile.getSize(),
                        "withdrawal-proofs"  // folder: withdrawal-proofs/
                );
                log.info("Proof file uploaded to S3 successfully: requestId={}, proofS3Key={}", withdrawalRequestId, proofS3Key);
            } catch (InvalidProofFileException e) {
                // Re-throw validation exceptions as-is
                throw e;
            } catch (Exception e) {
                log.error("Error uploading proof file: requestId={}, error={}", withdrawalRequestId, e.getMessage(), e);
                throw ProofFileUploadException.create(withdrawalRequestId, proofFile.getOriginalFilename(), e);
            }
        } else {
            log.warn("No proof file provided: requestId={}, proofFile={}", withdrawalRequestId, proofFile);
        }

        // Tính toán số dư mới: trừ từ balance và release hold
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.subtract(request.getAmount());  // Trừ tiền từ balance
        BigDecimal newHoldBalance = wallet.getHoldBalance().subtract(request.getAmount());  // Release hold
        if (newHoldBalance.compareTo(BigDecimal.ZERO) < 0) {
            log.warn("Hold balance would be negative, setting to 0: walletId={}, currentHold={}, amount={}",
                    wallet.getWalletId(), wallet.getHoldBalance(), request.getAmount());
            newHoldBalance = BigDecimal.ZERO;
        }

        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        wallet.setHoldBalance(newHoldBalance);
        walletRepository.save(wallet);

        // Tạo transaction record
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("withdrawal_amount", request.getAmount().toString());
        metadata.put("paid_amount", paidAmount != null ? paidAmount.toString() : request.getAmount().toString());
        metadata.put("currency", request.getCurrency().name());
        metadata.put("bank_account_number", request.getBankAccountNumber());
        metadata.put("bank_name", request.getBankName());
        metadata.put("account_holder_name", request.getAccountHolderName());
        metadata.put("withdrawal_request_id", withdrawalRequestId);
        if (provider != null && !provider.isBlank()) {
            metadata.put("provider", provider);
        }
        if (bankRef != null && !bankRef.isBlank()) {
            metadata.put("bank_ref", bankRef);
        }
        if (txnCode != null && !txnCode.isBlank()) {
            metadata.put("txn_code", txnCode);
        }
        if (proofS3Key != null && !proofS3Key.isBlank()) {
            metadata.put("proof_s3_key", proofS3Key);
            log.info("Proof S3 key added to metadata: requestId={}, proofS3Key={}", withdrawalRequestId, proofS3Key);
        } else {
            log.warn("Proof S3 key is null or blank: requestId={}, proofFile={}, proofS3Key={}", 
                withdrawalRequestId, proofFile != null ? "exists" : "null", proofS3Key);
        }
        if (request.getNote() != null && !request.getNote().isBlank()) {
            metadata.put("note", request.getNote());
        }
        if (request.getAdminNote() != null && !request.getAdminNote().isBlank()) {
            metadata.put("admin_note", request.getAdminNote());
        }

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.withdrawal)
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .createdAt(LocalDateTime.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Update withdrawal request
        request.setStatus(WithdrawalStatus.COMPLETED);
        request.setPaidAt(LocalDateTime.now());
        request.setPaidAmount(paidAmount != null ? paidAmount : request.getAmount());
        request.setProvider(provider);
        request.setBankRef(bankRef);
        request.setTxnCode(txnCode);
        request.setProofUrl(proofS3Key);  // Lưu S3 key thay vì URL (sẽ dùng để download)
        request.setCompletedBy(adminUserId);
        request.setCompletedAt(LocalDateTime.now());
        request.setWalletTransaction(savedTransaction);
        withdrawalRequestRepository.save(request);

        log.info("Completed withdrawal: requestId={}, walletId={}, amount={}, paidAmount={}, completedBy={}, balanceBefore={}, balanceAfter={}",
                withdrawalRequestId, wallet.getWalletId(), request.getAmount(), paidAmount, adminUserId, balanceBefore, balanceAfter);

        return walletMapper.toResponse(savedTransaction);
    }

    /**
     * Admin/Manager đánh dấu chuyển tiền thất bại/nhầm → Release hold về available
     */
    @Transactional
    public WithdrawalRequestResponse failWithdrawal(String withdrawalRequestId, String failureReason) {
        String adminUserId = getCurrentUserId();

        // Lấy withdrawal request
        WithdrawalRequest request = withdrawalRequestRepository.findById(withdrawalRequestId)
                .orElseThrow(() -> WithdrawalRequestNotFoundException.byId(withdrawalRequestId));

        // Kiểm tra status
        if (request.getStatus() != WithdrawalStatus.APPROVED && request.getStatus() != WithdrawalStatus.PROCESSING) {
            throw InvalidWithdrawalStatusException.forOperation(
                withdrawalRequestId, request.getStatus(), WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSING);
        }

        // Lấy wallet với lock để release hold
        Wallet wallet = walletRepository.findByIdWithLock(request.getWallet().getWalletId())
                .orElseThrow(() -> WalletNotFoundException.byId(request.getWallet().getWalletId()));

        // Release hold về available (hold → available)
        BigDecimal newHoldBalance = wallet.getHoldBalance().subtract(request.getAmount());
        if (newHoldBalance.compareTo(BigDecimal.ZERO) < 0) {
            log.warn("Hold balance would be negative, setting to 0: walletId={}, currentHold={}, amount={}",
                    wallet.getWalletId(), wallet.getHoldBalance(), request.getAmount());
            newHoldBalance = BigDecimal.ZERO;
        }
        wallet.setHoldBalance(newHoldBalance);
        walletRepository.save(wallet);

        // Update withdrawal request
        request.setStatus(WithdrawalStatus.FAILED);
        request.setFailedBy(adminUserId);
        request.setFailedAt(LocalDateTime.now());
        request.setFailureReason(failureReason);
        withdrawalRequestRepository.save(request);

        log.info("Failed withdrawal: requestId={}, walletId={}, amount={}, failedBy={}, reason={} (hold released)",
                withdrawalRequestId, wallet.getWalletId(), request.getAmount(), adminUserId, failureReason);

        return toWithdrawalRequestResponse(request);
    }

    /**
     * Lấy withdrawal request by ID (cho admin/manager)
     */
    @Transactional(readOnly = true)
    public WithdrawalRequest getWithdrawalRequestById(String withdrawalRequestId) {
        return withdrawalRequestRepository.findById(withdrawalRequestId)
                .orElseThrow(() -> WithdrawalRequestNotFoundException.byId(withdrawalRequestId));
    }

    /**
     * Download proof file từ S3 (private, cần authentication)
     */
    @Transactional(readOnly = true)
    public byte[] downloadProofFile(String proofS3Key) {
        try {
            return s3Service.downloadFile(proofS3Key);
        } catch (Exception e) {
            log.error("Error downloading proof file from S3: key={}, error={}", proofS3Key, e.getMessage(), e);
            throw ProofFileDownloadException.create(proofS3Key, e);
        }
    }

    /**
     * Lấy danh sách withdrawal requests (cho admin)
     */
    @Transactional(readOnly = true)
    public Page<WithdrawalRequestResponse> getWithdrawalRequests(WithdrawalStatus status, Pageable pageable) {
        Page<WithdrawalRequest> requests;
        if (status != null) {
            requests = withdrawalRequestRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else {
            requests = withdrawalRequestRepository.findAllByOrderByCreatedAtDesc(pageable);
        }
        return requests.map(this::toWithdrawalRequestResponse);
    }

    /**
     * Lấy danh sách withdrawal requests của user hiện tại
     */
    @Transactional(readOnly = true)
    public Page<WithdrawalRequestResponse> getMyWithdrawalRequests(WithdrawalStatus status, Pageable pageable) {
        String userId = getCurrentUserId();
        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> new WalletNotFoundException("Wallet not found for user: " + userId));

        Page<WithdrawalRequest> requests;
        if (status != null) {
            requests = withdrawalRequestRepository.findByWalletIdAndStatus(wallet.getWalletId(), status, pageable);
        } else {
            requests = withdrawalRequestRepository.findByWallet_WalletIdOrderByCreatedAtDesc(wallet.getWalletId(), pageable);
        }
        return requests.map(this::toWithdrawalRequestResponse);
    }

    /**
     * Convert WithdrawalRequest to Response DTO
     */
    private WithdrawalRequestResponse toWithdrawalRequestResponse(WithdrawalRequest request) {
        return WithdrawalRequestResponse.builder()
                .withdrawalRequestId(request.getWithdrawalRequestId())
                .walletId(request.getWallet().getWalletId())
                .userId(request.getWallet().getUserId())
                .amount(request.getAmount())
                .currency(request.getCurrency())
                .bankAccountNumber(request.getBankAccountNumber())
                .bankName(request.getBankName())
                .accountHolderName(request.getAccountHolderName())
                .note(request.getNote())
                .status(request.getStatus() != null ? request.getStatus().name() : null)
                .approvedBy(request.getApprovedBy())
                .approvedAt(request.getApprovedAt())
                .rejectedBy(request.getRejectedBy())
                .rejectedAt(request.getRejectedAt())
                .rejectionReason(request.getRejectionReason())
                .adminNote(request.getAdminNote())
                .paidAt(request.getPaidAt())
                .paidAmount(request.getPaidAmount())
                .provider(request.getProvider())
                .bankRef(request.getBankRef())
                .txnCode(request.getTxnCode())
                .proofUrl(request.getProofUrl())
                .completedBy(request.getCompletedBy())
                .completedAt(request.getCompletedAt())
                .failedBy(request.getFailedBy())
                .failedAt(request.getFailedAt())
                .failureReason(request.getFailureReason())
                .walletTxId(request.getWalletTransaction() != null ? request.getWalletTransaction().getWalletTxId() : null)
                .createdAt(request.getCreatedAt())
                .build();
    }

    /**
     * Lấy danh sách giao dịch của ví
     */
    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> getWalletTransactions(
            String walletId,
            WalletTxType txType,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable) {
        String userId = getCurrentUserId();

        // Kiểm tra wallet tồn tại và quyền truy cập
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        if (!wallet.getUserId().equals(userId)) {
            throw UnauthorizedWalletAccessException.create(walletId);
        }

        // Lấy transactions với filter - build query động dựa trên parameters
        Page<WalletTransaction> transactions;

        if (fromDate != null && toDate != null) {
            // Có cả fromDate và toDate
            transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndDateRange(
                    walletId, txType, fromDate, toDate, pageable);
        } else if (fromDate != null) {
            // Chỉ có fromDate
            transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndFromDate(
                    walletId, txType, fromDate, pageable);
        } else if (toDate != null) {
            // Chỉ có toDate
            transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndToDate(
                    walletId, txType, toDate, pageable);
        } else if (txType != null) {
            // Chỉ có txType
            transactions = walletTransactionRepository.findByWallet_WalletIdAndTxTypeOrderByCreatedAtDesc(
                    walletId, txType, pageable);
        } else {
            // Không có filter nào
            transactions = walletTransactionRepository.findByWallet_WalletIdOrderByCreatedAtDesc(
                    walletId, pageable);
        }

        return transactions.map(walletMapper::toResponse);
    }

    /**
     * Lấy danh sách giao dịch của ví hiện tại
     */
    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> getMyWalletTransactions(
            WalletTxType txType,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable) {
        String userId = getCurrentUserId();

        Wallet wallet = walletRepository.findByUserId(userId)
                .orElseThrow(() -> WalletNotFoundException.byUserId(userId));

        return getWalletTransactions(wallet.getWalletId(), txType, fromDate, toDate, pageable);
    }

    /**
     * Lấy tất cả wallets (Admin only)
     */
    @Transactional(readOnly = true)
    public Page<WalletResponse> getAllWallets(String userId, Pageable pageable) {
        Page<Wallet> wallets;
        if (userId != null && !userId.isEmpty()) {
            wallets = walletRepository.findAllByUserId(userId, pageable);
        } else {
            wallets = walletRepository.findAll(pageable);
        }
        return wallets.map(walletMapper::toResponse);
    }

    /**
     * Lấy wallet theo ID (Admin only - không check ownership)
     */
    @Transactional(readOnly = true)
    public WalletResponse getWalletByIdForAdmin(String walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));
        return walletMapper.toResponse(wallet);
    }

    /**
     * Lấy danh sách giao dịch của wallet (Admin only - không check ownership)
     */
    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> getWalletTransactionsForAdmin(
            String walletId,
            WalletTxType txType,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            String search,
            Pageable pageable) {
        // Kiểm tra wallet tồn tại
        if (!walletRepository.existsById(walletId)) {
            throw WalletNotFoundException.byId(walletId);
        }

        // Normalize search string (null hoặc empty string -> null)
        String searchTerm = (search != null && search.trim().isEmpty()) ? null : search;

        // Lấy transactions với filter - build query động dựa trên parameters
        Page<WalletTransaction> transactions;

        boolean hasSearch = searchTerm != null && !searchTerm.trim().isEmpty();
        boolean hasFromDate = fromDate != null;
        boolean hasToDate = toDate != null;

        if (hasSearch) {
            // Có search
            if (hasFromDate && hasToDate) {
                transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndSearchAndDateRange(
                        walletId, txType, searchTerm, fromDate, toDate, pageable);
            } else if (hasFromDate) {
                transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndSearchAndFromDate(
                        walletId, txType, searchTerm, fromDate, pageable);
            } else if (hasToDate) {
                transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndSearchAndToDate(
                        walletId, txType, searchTerm, toDate, pageable);
            } else {
                transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndSearch(
                        walletId, txType, searchTerm, pageable);
            }
        } else {
            // Không có search
            if (hasFromDate && hasToDate) {
                transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndDateRange(
                        walletId, txType, fromDate, toDate, pageable);
            } else if (hasFromDate) {
                transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndFromDate(
                        walletId, txType, fromDate, pageable);
            } else if (hasToDate) {
                transactions = walletTransactionRepository.findByWalletIdAndTxTypeAndToDate(
                        walletId, txType, toDate, pageable);
            } else if (txType != null) {
                transactions = walletTransactionRepository.findByWallet_WalletIdAndTxTypeOrderByCreatedAtDesc(
                        walletId, txType, pageable);
            } else {
                transactions = walletTransactionRepository.findByWallet_WalletIdOrderByCreatedAtDesc(
                        walletId, pageable);
            }
        }

        return transactions.map(walletMapper::toResponse);
    }

    /**
     * Aggregate basic wallet and transaction statistics for admin dashboard.
     */
    @Transactional(readOnly = true)
    public WalletStatisticsResponse getWalletStatisticsForAdmin() {
        long totalWallets = walletRepository.count();
        BigDecimal totalBalance = walletRepository.sumAllBalances();

        long totalTransactions = walletTransactionRepository.count();

        // Use GROUP BY query to get all transaction type counts in one query instead of looping
        Map<WalletTxType, Long> transactionsByType = new HashMap<>();
        List<Object[]> typeCounts = walletTransactionRepository.countByTxTypeGroupBy();
        for (Object[] result : typeCounts) {
            WalletTxType type = (WalletTxType) result[0];
            Long count = ((Number) result[1]).longValue();
            transactionsByType.put(type, count);
        }

        return WalletStatisticsResponse.builder()
                .totalWallets(totalWallets)
                .totalBalance(totalBalance)
                .totalTransactions(totalTransactions)
                .transactionsByType(transactionsByType)
                .build();
    }

    /**
     * Get topup volume statistics grouped by date for a given time range
     * @param days Number of days to look back (7, 30, etc.)
     * @return TopupVolumeByDateResponse with daily topup amounts
     */
    @Transactional(readOnly = true)
    public TopupVolumeByDateResponse getTopupVolumeByDate(int days) {
        log.info("Getting topup volume statistics by date for last {} days", days);
        
        // Set endDate to start of tomorrow to include all transactions from today
        // Query uses < :endDate, so this will include everything up to end of today
        LocalDateTime endDate = LocalDateTime.now().toLocalDate().plusDays(1).atStartOfDay();
        
        // For "today" (days=1), start from beginning of today (00:00:00)
        // For other ranges, use last N days from now
        LocalDateTime startDate;
        if (days == 1) {
            startDate = LocalDateTime.now().toLocalDate().atStartOfDay();
        } else {
            startDate = endDate.minusDays(days);
        }
        
        log.debug("Topup volume date range: startDate={}, endDate={}, days={}", startDate, endDate, days);
        
        List<Object[]> results = walletTransactionRepository.sumAmountsByDateRange(
            WalletTxType.topup, startDate, endDate);
        
        // Convert results to DailyTopupVolume
        List<TopupVolumeByDateResponse.DailyTopupVolume> dailyStats = results.stream()
            .map(result -> {
                LocalDate date = (LocalDate) result[0];
                BigDecimal amount = (BigDecimal) result[1];
                return TopupVolumeByDateResponse.DailyTopupVolume.builder()
                    .date(date)
                    .amount(amount != null ? amount : BigDecimal.ZERO)
                    .build();
            })
            .collect(Collectors.toList());
        
        return TopupVolumeByDateResponse.builder()
            .dailyStats(dailyStats)
            .build();
    }

    /**
     * Get revenue statistics for admin dashboard
     * @param days Number of days to look back (1 for today, 7 for last 7 days, 30 for last 30 days)
     * @return RevenueStatisticsResponse with total, topups, services revenue and trends
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Transactional(readOnly = true)
    public RevenueStatisticsResponse getRevenueStatistics(int days) {
        log.info("Getting revenue statistics for last {} days", days);
        
        // Set endDate to start of tomorrow to include all transactions from today
        // Query uses < :endDate, so this will include everything up to end of today
        LocalDateTime endDate = LocalDateTime.now().toLocalDate().plusDays(1).atStartOfDay();
        
        // For "today" (days=1), start from beginning of today (00:00:00)
        // For other ranges, use last N days from now
        LocalDateTime startDate;
        if (days == 1) {
            startDate = LocalDateTime.now().toLocalDate().atStartOfDay();
        } else {
            startDate = endDate.minusDays(days);
        }
        
        log.debug("Revenue statistics date range: startDate={}, endDate={}, days={}", startDate, endDate, days);
        
        // Calculate previous period for trend comparison
        LocalDateTime prevEndDate = startDate;
        LocalDateTime prevStartDate = prevEndDate.minusDays(days);
        
        // Transaction types for topups
        List<WalletTxType> topupTypes = List.of(WalletTxType.topup);
        
        // Transaction types for services (payments)
        List<WalletTxType> serviceTypes = List.of(
            WalletTxType.contract_deposit_payment,
            WalletTxType.milestone_payment,
            WalletTxType.recording_booking_payment,
            WalletTxType.revision_fee
        );
        
        // All revenue transaction types
        List<WalletTxType> allRevenueTypes = new ArrayList<>(topupTypes);
        allRevenueTypes.addAll(serviceTypes);
        
        // Get revenue data and transaction counts for current and previous periods
        List<Object[]> currentPeriodData = walletTransactionRepository.sumRevenueAmountsByTypeAndDate(
            allRevenueTypes, startDate, endDate);
        List<Object[]> prevPeriodData = walletTransactionRepository.sumRevenueAmountsByTypeAndDate(
            allRevenueTypes, prevStartDate, prevEndDate);
        List<Object[]> currentPeriodCounts = walletTransactionRepository.countTransactionsByTypeAndDate(
            allRevenueTypes, startDate, endDate);
        
        // Initialize totals
        BigDecimal currentTotalTopups = BigDecimal.ZERO;
        BigDecimal currentTotalServices = BigDecimal.ZERO;
        BigDecimal prevTotalTopups = BigDecimal.ZERO;
        BigDecimal prevTotalServices = BigDecimal.ZERO;
        Map<LocalDate, BigDecimal> topupByDate = new HashMap<>();
        Map<LocalDate, BigDecimal> serviceByDate = new HashMap<>();
        Map<LocalDate, Long> topupCountByDate = new HashMap<>();
        Map<LocalDate, Long> serviceCountByDate = new HashMap<>();
        
        // Process current period revenue data
        for (Object[] row : currentPeriodData) {
            WalletTxType txType = (WalletTxType) row[0];
            LocalDate date = (LocalDate) row[1];
            BigDecimal amount = (BigDecimal) row[2];
            if (amount == null) amount = BigDecimal.ZERO;
            
            boolean isTopup = topupTypes.contains(txType);
            
            // Accumulate totals
            if (isTopup) {
                currentTotalTopups = currentTotalTopups.add(amount);
                topupByDate.merge(date, amount, BigDecimal::add);
            } else {
                currentTotalServices = currentTotalServices.add(amount);
                serviceByDate.merge(date, amount, BigDecimal::add);
            }
        }
        
        // Process current period transaction counts
        for (Object[] row : currentPeriodCounts) {
            WalletTxType txType = (WalletTxType) row[0];
            LocalDate date = (LocalDate) row[1];
            Long count = ((Number) row[2]).longValue();
            
            boolean isTopup = topupTypes.contains(txType);
            
            if (isTopup) {
                topupCountByDate.merge(date, count, Long::sum);
            } else {
                serviceCountByDate.merge(date, count, Long::sum);
            }
        }
        
        // Process previous period data
        for (Object[] row : prevPeriodData) {
            WalletTxType txType = (WalletTxType) row[0];
            BigDecimal amount = (BigDecimal) row[2];
            if (amount == null) amount = BigDecimal.ZERO;
            
            boolean isTopup = topupTypes.contains(txType);
            
            // Accumulate totals for previous period
            if (isTopup) {
                prevTotalTopups = prevTotalTopups.add(amount);
            } else {
                prevTotalServices = prevTotalServices.add(amount);
            }
        }
        
        BigDecimal currentTotal = currentTotalTopups.add(currentTotalServices);
        BigDecimal prevTotal = prevTotalTopups.add(prevTotalServices);
        
        // Calculate trends (percentage change)
        double topupTrend = prevTotalTopups.compareTo(BigDecimal.ZERO) == 0 
            ? (currentTotalTopups.compareTo(BigDecimal.ZERO) == 0 ? 0.0 : 100.0)
            : currentTotalTopups.subtract(prevTotalTopups)
                .divide(prevTotalTopups, 4, java.math.RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).doubleValue();
        
        double serviceTrend = prevTotalServices.compareTo(BigDecimal.ZERO) == 0
            ? (currentTotalServices.compareTo(BigDecimal.ZERO) == 0 ? 0.0 : 100.0)
            : currentTotalServices.subtract(prevTotalServices)
                .divide(prevTotalServices, 4, java.math.RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).doubleValue();
        
        double totalTrend = prevTotal.compareTo(BigDecimal.ZERO) == 0
            ? (currentTotal.compareTo(BigDecimal.ZERO) == 0 ? 0.0 : 100.0)
            : currentTotal.subtract(prevTotal)
                .divide(prevTotal, 4, java.math.RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100")).doubleValue();
        
        // Create combined daily stats - include all dates from revenue and counts
        Set<LocalDate> allDates = new HashSet<>(topupByDate.keySet());
        allDates.addAll(serviceByDate.keySet());
        allDates.addAll(topupCountByDate.keySet());
        allDates.addAll(serviceCountByDate.keySet());
        
        List<RevenueStatisticsResponse.DailyRevenue> dailyStats = allDates.stream()
            .sorted()
            .map(date -> {
                BigDecimal topup = topupByDate.getOrDefault(date, BigDecimal.ZERO);
                BigDecimal service = serviceByDate.getOrDefault(date, BigDecimal.ZERO);
                Long topupCount = topupCountByDate.getOrDefault(date, 0L);
                Long serviceCount = serviceCountByDate.getOrDefault(date, 0L);
                
                // Calculate average transaction values: revenue / count
                BigDecimal avgTopup = (topupCount > 0 && topup.compareTo(BigDecimal.ZERO) > 0)
                    ? topup.divide(new BigDecimal(topupCount), 2, java.math.RoundingMode.HALF_UP)
                    : null;
                BigDecimal avgService = (serviceCount > 0 && service.compareTo(BigDecimal.ZERO) > 0)
                    ? service.divide(new BigDecimal(serviceCount), 2, java.math.RoundingMode.HALF_UP)
                    : null;
                
                return RevenueStatisticsResponse.DailyRevenue.builder()
                    .date(date)
                    .topupRevenue(topup)
                    .serviceRevenue(service)
                    .totalRevenue(topup.add(service))
                    .avgTopupTransactionValue(avgTopup)
                    .avgServiceTransactionValue(avgService)
                    .build();
            })
            .collect(Collectors.toList());
        
        // Fill missing dates with zero (for complete sparkline)
        // endDate is start of tomorrow, so we want to include up to today
        List<RevenueStatisticsResponse.DailyRevenue> completeDailyStats = new ArrayList<>();
        LocalDate currentDate = startDate.toLocalDate();
        LocalDate endLocalDate = endDate.toLocalDate().minusDays(1); // endDate is tomorrow, so minus 1 = today
        Map<LocalDate, RevenueStatisticsResponse.DailyRevenue> dailyMap = dailyStats.stream()
            .collect(Collectors.toMap(
                RevenueStatisticsResponse.DailyRevenue::getDate,
                d -> d
            ));
        
        log.debug("Filling dates from {} to {} (inclusive)", currentDate, endLocalDate);
        while (!currentDate.isAfter(endLocalDate)) {
            RevenueStatisticsResponse.DailyRevenue daily = dailyMap.get(currentDate);
            if (daily != null) {
                completeDailyStats.add(daily);
            } else {
                completeDailyStats.add(RevenueStatisticsResponse.DailyRevenue.builder()
                    .date(currentDate)
                    .topupRevenue(BigDecimal.ZERO)
                    .serviceRevenue(BigDecimal.ZERO)
                    .totalRevenue(BigDecimal.ZERO)
                    .avgTopupTransactionValue(null)
                    .avgServiceTransactionValue(null)
                    .build());
            }
            currentDate = currentDate.plusDays(1);
        }
        
        // Create sparkline data (daily totals)
        List<BigDecimal> totalSparkline = completeDailyStats.stream()
            .map(RevenueStatisticsResponse.DailyRevenue::getTotalRevenue)
            .collect(Collectors.toList());
        
        List<BigDecimal> topupSparkline = completeDailyStats.stream()
            .map(RevenueStatisticsResponse.DailyRevenue::getTopupRevenue)
            .collect(Collectors.toList());
        
        List<BigDecimal> serviceSparkline = completeDailyStats.stream()
            .map(RevenueStatisticsResponse.DailyRevenue::getServiceRevenue)
            .collect(Collectors.toList());
        
        // Build response
        return RevenueStatisticsResponse.builder()
            .total(RevenueStatisticsResponse.RevenueMetrics.builder()
                .value(currentTotal)
                .trend(totalTrend)
                .sparkline(totalSparkline)
                .build())
            .fromTopups(RevenueStatisticsResponse.RevenueMetrics.builder()
                .value(currentTotalTopups)
                .trend(topupTrend)
                .sparkline(topupSparkline)
                .build())
            .fromServices(RevenueStatisticsResponse.RevenueMetrics.builder()
                .value(currentTotalServices)
                .trend(serviceTrend)
                .sparkline(serviceSparkline)
                .build())
            .dailyStats(completeDailyStats)
            .build();
    }

    /**
     * Get all wallet dashboard statistics (statistics, topup volume, và revenue statistics)
     * Gộp tất cả wallet statistics vào một response để giảm số lượng API calls
     * @param days Number of days to look back for topup volume and revenue statistics
     * @return WalletDashboardStatisticsResponse với đầy đủ statistics
     */
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Transactional(readOnly = true)
    public WalletDashboardStatisticsResponse getWalletDashboardStatistics(int days) {
        log.info("Getting all wallet dashboard statistics for last {} days", days);
        
        WalletStatisticsResponse statistics = getWalletStatisticsForAdmin();
        TopupVolumeByDateResponse topupVolume = getTopupVolumeByDate(days);
        RevenueStatisticsResponse revenueStatistics = getRevenueStatistics(days);
        
        return WalletDashboardStatisticsResponse.builder()
                .statistics(statistics)
                .topupVolume(topupVolume)
                .revenueStatistics(revenueStatistics)
                .build();
    }

    /**
     * Admin điều chỉnh số dư ví (thêm hoặc trừ tiền) - Admin only
     */
    @Transactional
    public WalletTransactionResponse adjustWalletBalance(String walletId, AdjustWalletBalanceRequest request) {
        String adminUserId = getCurrentUserId();

        // Validate amount - phải khác 0
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) == 0) {
            throw InvalidAdjustmentAmountException.zeroAmount();
        }

        // Lấy wallet với lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(walletId)
                .orElseThrow(() -> WalletNotFoundException.byId(walletId));

        // Validate currency
        CurrencyType currency = wallet.getCurrency();

        // Tính toán số dư mới
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal balanceAfter = balanceBefore.add(request.getAmount());

        // Kiểm tra nếu trừ tiền mà số dư sau khi điều chỉnh < 0
        if (balanceAfter.compareTo(BigDecimal.ZERO) < 0) {
            throw InvalidAdjustmentAmountException.insufficientBalance(request.getAmount(), balanceBefore);
        }

        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        walletRepository.save(wallet);

        // Tạo transaction record với type adjustment
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("adjustment_amount", request.getAmount().toString());
        metadata.put("currency", currency.name());
        metadata.put("reason", request.getReason());
        metadata.put("adjusted_by", adminUserId);

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.adjustment)
                .amount(request.getAmount().abs())  // Lưu số tiền tuyệt đối
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .createdAt(LocalDateTime.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        log.info("Admin adjusted wallet balance: walletId={}, amount={}, reason={}, adjustedBy={}, balanceBefore={}, balanceAfter={}",
                walletId, request.getAmount(), request.getReason(), adminUserId, balanceBefore, balanceAfter);

        return walletMapper.toResponse(savedTransaction);
    }

    /**
     * Refund revision fee (gọi từ Kafka consumer khi manager reject paid revision)
     * Internal method - không cần authentication vì gọi từ consumer
     */
    @Transactional
    public WalletTransactionResponse refundRevisionFee(String paidWalletTxId, String refundReason) {
        log.info("Refunding revision fee: paidWalletTxId={}, refundReason={}", paidWalletTxId, refundReason);
        
        // Tìm original transaction
        WalletTransaction originalTx = walletTransactionRepository.findByWalletTxId(paidWalletTxId)
                .orElseThrow(() -> new RuntimeException("Original transaction not found: " + paidWalletTxId));
        
        // Verify đây là revision_fee transaction
        if (originalTx.getTxType() != WalletTxType.revision_fee) {
            throw InvalidTransactionTypeException.forOperation(
                paidWalletTxId, originalTx.getTxType(), WalletTxType.revision_fee);
        }
        
        // Verify chưa được refund
        if (walletTransactionRepository.findByRefundOfWalletTx_WalletTxId(paidWalletTxId).isPresent()) {
            throw TransactionAlreadyRefundedException.create(paidWalletTxId);
        }
        
        // Lấy wallet và lock để tránh race condition
        Wallet wallet = walletRepository.findByIdWithLock(originalTx.getWallet().getWalletId())
                .orElseThrow(() -> WalletNotFoundException.byId(originalTx.getWallet().getWalletId()));
        
        // Tính toán số dư mới (refund = cộng tiền lại)
        BigDecimal balanceBefore = wallet.getBalance();
        BigDecimal refundAmount = originalTx.getAmount();  // Refund toàn bộ số tiền đã trừ
        BigDecimal balanceAfter = balanceBefore.add(refundAmount);
        
        // Cập nhật số dư ví
        wallet.setBalance(balanceAfter);
        walletRepository.save(wallet);
        
        // Tạo refund transaction record
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("refund_amount", refundAmount.toString());
        metadata.put("currency", originalTx.getCurrency().name());
        metadata.put("payment_method", "wallet");
        metadata.put("reason", "REVISION_REJECTED");
        metadata.put("refund_reason", refundReason != null ? refundReason : "Manager rejected revision request");
        metadata.put("original_wallet_tx_id", paidWalletTxId);
        metadata.put("contract_id", originalTx.getContractId());
        metadata.put("milestone_id", originalTx.getMilestoneId());
        metadata.put("submission_id", originalTx.getSubmissionId());
        
        WalletTransaction refundTx = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.refund)
                .amount(refundAmount)
                .currency(originalTx.getCurrency())
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .refundOfWalletTx(originalTx)  // Link đến original transaction
                .contractId(originalTx.getContractId())
                .milestoneId(originalTx.getMilestoneId())
                .submissionId(originalTx.getSubmissionId())
                .createdAt(LocalDateTime.now())
                .build();
        
        WalletTransaction savedRefundTx = walletTransactionRepository.save(refundTx);
        
        log.info("Refunded revision fee: originalTxId={}, refundTxId={}, amount={}, balanceBefore={}, balanceAfter={}", 
                paidWalletTxId, savedRefundTx.getWalletTxId(), refundAmount, balanceBefore, balanceAfter);
        
        return walletMapper.toResponse(savedRefundTx);
    }

    /**
     * Refund revision fee và publish event với đầy đủ thông tin (gọi từ consumer)
     */
    @Transactional
    public WalletTransactionResponse refundRevisionFeeAndPublishEvent(
            String paidWalletTxId,
            String refundReason,
            RevisionFeeRefundedEvent originalEvent) {
        
        // Thực hiện refund
        WalletTransactionResponse refundResponse = refundRevisionFee(paidWalletTxId, refundReason);
        
        // Publish event với đầy đủ thông tin sau khi refund thành công
        try {
            LocalDateTime refundedAt = LocalDateTime.now();
            
            UUID eventId = UUID.randomUUID();
            RevisionFeeRefundedEvent event = RevisionFeeRefundedEvent.builder()
                    .eventId(eventId)
                    .revisionRequestId(originalEvent.getRevisionRequestId())
                    .contractId(originalEvent.getContractId())
                    .contractNumber(originalEvent.getContractNumber())
                    .milestoneId(originalEvent.getMilestoneId())
                    .milestoneName(originalEvent.getMilestoneName())
                    .taskAssignmentId(originalEvent.getTaskAssignmentId())
                    .customerUserId(originalEvent.getCustomerUserId())
                    .paidWalletTxId(paidWalletTxId)
                    .refundAmount(refundResponse.getAmount())  // Lấy từ refund transaction
                    .currency(refundResponse.getCurrency().name())  // Lấy từ refund transaction
                    .refundReason(refundReason)
                    .managerUserId(originalEvent.getManagerUserId())
                    .refundedAt(refundedAt)
                    .timestamp(refundedAt)
                    .build();
            
            JsonNode payload = objectMapper.valueToTree(event);
            OutboxEvent saved = saveOutboxEvent(
                originalEvent.getContractId(),
                "RevisionRequest",
                "billing.revision.fee.refunded",
                payload
            );
            
            log.info("✅ Queued RevisionFeeRefundedEvent in outbox: outboxId={}, eventId={}, paidWalletTxId={}, refundAmount={}, currency={}",
                    saved.getOutboxId(), eventId, paidWalletTxId, refundResponse.getAmount(), refundResponse.getCurrency());
        } catch (Exception e) {
            // Log error nhưng không fail transaction vì refund đã thành công
            log.error("Failed to enqueue RevisionFeeRefundedEvent: paidWalletTxId={}, error={}", 
                    paidWalletTxId, e.getMessage(), e);
        }
        
        return refundResponse;
    }

    /**
     * Helper method để lưu OutboxEvent với pattern chung
     * 
     * @param contractId Contract ID để tạo aggregateId
     * @param aggregateType Loại aggregate (ví dụ: "Contract", "RevisionRequest")
     * @param eventType Loại event (ví dụ: "billing.deposit.paid")
     * @param payload JsonNode payload của event
     * @return OutboxEvent đã được lưu
     */
    private OutboxEvent saveOutboxEvent(String contractId, String aggregateType, String eventType, JsonNode payload) {
        UUID aggregateId;
        try {
            aggregateId = UUID.fromString(contractId);
        } catch (IllegalArgumentException ex) {
            aggregateId = UUID.randomUUID();
            log.warn("Invalid contractId format, using random UUID: contractId={}", contractId);
        }
        
        OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateId(aggregateId)
                .aggregateType(aggregateType)
                .eventType(eventType)
                .eventPayload(payload)
                .build();
        
        return outboxEventRepository.save(outboxEvent);
    }

    /**
     * Lấy current user ID từ JWT token
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            log.error("userId claim not found in JWT - this should not happen!");
            throw UserNotAuthenticatedException.create();
        }
        throw UserNotAuthenticatedException.create();
    }
}
