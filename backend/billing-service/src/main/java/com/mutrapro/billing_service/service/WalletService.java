package com.mutrapro.billing_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.billing_service.dto.request.DebitWalletRequest;
import com.mutrapro.billing_service.dto.request.TopupWalletRequest;
import com.mutrapro.billing_service.dto.response.WalletResponse;
import com.mutrapro.billing_service.dto.response.WalletTransactionResponse;
import com.mutrapro.billing_service.entity.OutboxEvent;
import com.mutrapro.billing_service.entity.Wallet;
import com.mutrapro.billing_service.entity.WalletTransaction;
import com.mutrapro.billing_service.repository.OutboxEventRepository;
import com.mutrapro.shared.event.MilestonePaidEvent;
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
     * Trừ tiền từ ví (debit)
     */
    @Transactional
    public WalletTransactionResponse debitWallet(String walletId, DebitWalletRequest request) {
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
        metadata.put("payment_method", "wallet");  // Luôn là wallet vì thanh toán từ ví
        if (request.getPaymentId() != null) {
            metadata.put("payment_id", request.getPaymentId().toString());
        }

        WalletTransaction transaction = WalletTransaction.builder()
                .wallet(wallet)
                .txType(WalletTxType.payment)
                .amount(request.getAmount())
                .currency(currency)
                .balanceBefore(balanceBefore)
                .balanceAfter(balanceAfter)
                .metadata(metadata)
                .contractId(request.getContractId())
                .milestoneId(request.getMilestoneId())
                .bookingId(request.getBookingId())
                .createdAt(Instant.now())
                .build();

        WalletTransaction savedTransaction = walletTransactionRepository.save(transaction);

        // Nếu có milestoneId, gửi MilestonePaidEvent để project-service update milestone status
        if (request.getMilestoneId() != null && !request.getMilestoneId().isBlank() 
            && request.getContractId() != null && !request.getContractId().isBlank()) {
            try {
                Instant paidAt = Instant.now();
                
                // Tạo MilestonePaidEvent
                UUID eventId = UUID.randomUUID();
                MilestonePaidEvent event = MilestonePaidEvent.builder()
                    .eventId(eventId)
                    .contractId(request.getContractId())
                    .milestoneId(request.getMilestoneId())
                    .orderIndex(request.getOrderIndex())  // Optional, project-service có thể lấy từ milestoneId
                    .paidAt(paidAt)
                    .amount(request.getAmount())
                    .currency(currency.name())
                    .timestamp(Instant.now())
                    .build();
                
                JsonNode payload = objectMapper.valueToTree(event);
                
                UUID aggregateId;
                try {
                    aggregateId = UUID.fromString(request.getContractId());
                } catch (IllegalArgumentException ex) {
                    aggregateId = UUID.randomUUID();
                    log.warn("Invalid contractId format, using random UUID: contractId={}", 
                        request.getContractId());
                }
                
                OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(aggregateId)
                    .aggregateType("ContractMilestone")
                    .eventType("billing.milestone-paid")
                    .eventPayload(payload)
                    .build();
                
                OutboxEvent saved = outboxEventRepository.save(outboxEvent);
                
                log.info("✅ Queued MilestonePaidEvent in outbox: outboxId={}, eventId={}, contractId={}, milestoneId={}, orderIndex={}, paidAt={}",
                    saved.getOutboxId(), eventId, request.getContractId(), 
                    request.getMilestoneId(), request.getOrderIndex(), paidAt);
            } catch (Exception e) {
                log.error("❌ Failed to enqueue MilestonePaidEvent: contractId={}, milestoneId={}, error={}",
                    request.getContractId(), request.getMilestoneId(), e.getMessage(), e);
                // Không throw exception - transaction đã được tạo thành công
            }
        }

        log.info("Debit wallet: walletId={}, amount={}, balanceBefore={}, balanceAfter={}",
                walletId, request.getAmount(), balanceBefore, balanceAfter);

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
     * Lấy current user ID từ JWT token
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("userId");
            if (userId != null && !userId.isEmpty()) {
                return userId;
            }
            log.warn("userId claim not found in JWT, falling back to subject");
            String subject = jwt.getSubject();
            if (subject != null && !subject.isEmpty()) {
                return subject;
            }
        }
        throw UserNotAuthenticatedException.create();
    }
}
