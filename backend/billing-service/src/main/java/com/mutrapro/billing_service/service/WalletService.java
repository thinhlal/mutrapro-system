package com.mutrapro.billing_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.billing_service.dto.request.PayDepositRequest;
import com.mutrapro.billing_service.dto.request.PayMilestoneRequest;
import com.mutrapro.billing_service.dto.request.PayRevisionFeeRequest;
import com.mutrapro.billing_service.dto.request.TopupWalletRequest;
import com.mutrapro.billing_service.dto.response.WalletResponse;
import com.mutrapro.billing_service.dto.response.WalletTransactionResponse;
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
import com.mutrapro.billing_service.exception.CurrencyMismatchException;
import com.mutrapro.billing_service.exception.InsufficientBalanceException;
import com.mutrapro.billing_service.exception.InvalidAmountException;
import com.mutrapro.billing_service.exception.UnauthorizedWalletAccessException;
import com.mutrapro.billing_service.exception.UserNotAuthenticatedException;
import com.mutrapro.billing_service.exception.WalletNotFoundException;
import com.mutrapro.billing_service.mapper.WalletMapper;
import com.mutrapro.billing_service.repository.WalletRepository;
import com.mutrapro.billing_service.repository.WalletTransactionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

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
                .createdAt(Instant.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        log.info("Topup wallet: walletId={}, amount={}, balanceBefore={}, balanceAfter={}",
                walletId, request.getAmount(), balanceBefore, balanceAfter);

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

        // Kiểm tra số dư
        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, wallet.getBalance(), request.getAmount());
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
                .createdAt(Instant.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Gửi DepositPaidEvent cho DEPOSIT
        try {
            Instant paidAt = Instant.now();
            
            UUID eventId = UUID.randomUUID();
            DepositPaidEvent event = DepositPaidEvent.builder()
                .eventId(eventId)
                .contractId(request.getContractId())
                .installmentId(request.getInstallmentId())
                .paidAt(paidAt)
                .amount(request.getAmount())
                .currency(currency.name())
                .timestamp(Instant.now())
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

        // Kiểm tra số dư
        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, wallet.getBalance(), request.getAmount());
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
        metadata.put("payment_type", "MILESTONE");

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.milestone_payment)
                .amount(request.getAmount())
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .contractId(request.getContractId())
                .milestoneId(request.getMilestoneId())
                .createdAt(Instant.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Gửi MilestonePaidEvent cho milestone payment
        try {
            Instant paidAt = Instant.now();
            
            UUID eventId = UUID.randomUUID();
            MilestonePaidEvent event = MilestonePaidEvent.builder()
                .eventId(eventId)
                .contractId(request.getContractId())
                .milestoneId(request.getMilestoneId())
                .orderIndex(request.getOrderIndex())
                .paidAt(paidAt)
                .amount(request.getAmount())
                .currency(currency.name())
                .timestamp(Instant.now())
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
                walletId, request.getContractId(), request.getMilestoneId(), request.getAmount(), balanceBefore, balanceAfter);

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

        // Kiểm tra số dư
        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw InsufficientBalanceException.create(
                    walletId, wallet.getBalance(), request.getAmount());
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
                .createdAt(Instant.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Gửi RevisionFeePaidEvent cho revision fee payment
        try {
            Instant paidAt = Instant.now();
            
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
                .timestamp(Instant.now())
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
     * Lấy danh sách giao dịch của ví
     */
    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> getWalletTransactions(
            String walletId,
            WalletTxType txType,
            Instant fromDate,
            Instant toDate,
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
            Instant fromDate,
            Instant toDate,
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
            Instant fromDate,
            Instant toDate,
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
            throw new RuntimeException("Transaction is not a revision fee: " + paidWalletTxId + ", type: " + originalTx.getTxType());
        }
        
        // Verify chưa được refund
        if (walletTransactionRepository.findByRefundOfWalletTx_WalletTxId(paidWalletTxId).isPresent()) {
            throw new RuntimeException("Transaction already refunded: " + paidWalletTxId);
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
                .createdAt(Instant.now())
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
            Instant refundedAt = Instant.now();
            
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
