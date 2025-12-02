package com.mutrapro.billing_service.repository;

import com.mutrapro.billing_service.entity.WalletTransaction;
import com.mutrapro.billing_service.enums.WalletTxType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, String> {

    Page<WalletTransaction> findByWallet_WalletIdOrderByCreatedAtDesc(String walletId, Pageable pageable);

    List<WalletTransaction> findByWallet_WalletIdOrderByCreatedAtDesc(String walletId);
    
    // Query không có date filters
    Page<WalletTransaction> findByWallet_WalletIdAndTxTypeOrderByCreatedAtDesc(
            String walletId, WalletTxType txType, Pageable pageable);
    
    // Query chỉ có fromDate
    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId " +
           "AND (:txType IS NULL OR wt.txType = :txType) " +
           "AND wt.createdAt >= :fromDate " +
           "ORDER BY wt.createdAt DESC")
    Page<WalletTransaction> findByWalletIdAndTxTypeAndFromDate(
            @Param("walletId") String walletId,
            @Param("txType") WalletTxType txType,
            @Param("fromDate") Instant fromDate,
            Pageable pageable);
    
    // Query chỉ có toDate
    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId " +
           "AND (:txType IS NULL OR wt.txType = :txType) " +
           "AND wt.createdAt <= :toDate " +
           "ORDER BY wt.createdAt DESC")
    Page<WalletTransaction> findByWalletIdAndTxTypeAndToDate(
            @Param("walletId") String walletId,
            @Param("txType") WalletTxType txType,
            @Param("toDate") Instant toDate,
            Pageable pageable);
    
    // Query có cả fromDate và toDate
    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId " +
           "AND (:txType IS NULL OR wt.txType = :txType) " +
           "AND wt.createdAt >= :fromDate AND wt.createdAt <= :toDate " +
           "ORDER BY wt.createdAt DESC")
    Page<WalletTransaction> findByWalletIdAndTxTypeAndDateRange(
            @Param("walletId") String walletId,
            @Param("txType") WalletTxType txType,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable);

    // Query với search (walletTxId, contractId, milestoneId, bookingId)
    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId " +
           "AND (:txType IS NULL OR wt.txType = :txType) " +
           "AND (:search IS NULL OR LOWER(wt.walletTxId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.contractId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.milestoneId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.bookingId) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY wt.createdAt DESC")
    Page<WalletTransaction> findByWalletIdAndTxTypeAndSearch(
            @Param("walletId") String walletId,
            @Param("txType") WalletTxType txType,
            @Param("search") String search,
            Pageable pageable);

    // Query với search và fromDate
    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId " +
           "AND (:txType IS NULL OR wt.txType = :txType) " +
           "AND (:search IS NULL OR LOWER(wt.walletTxId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.contractId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.milestoneId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.bookingId) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND wt.createdAt >= :fromDate " +
           "ORDER BY wt.createdAt DESC")
    Page<WalletTransaction> findByWalletIdAndTxTypeAndSearchAndFromDate(
            @Param("walletId") String walletId,
            @Param("txType") WalletTxType txType,
            @Param("search") String search,
            @Param("fromDate") Instant fromDate,
            Pageable pageable);

    // Query với search và toDate
    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId " +
           "AND (:txType IS NULL OR wt.txType = :txType) " +
           "AND (:search IS NULL OR LOWER(wt.walletTxId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.contractId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.milestoneId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.bookingId) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND wt.createdAt <= :toDate " +
           "ORDER BY wt.createdAt DESC")
    Page<WalletTransaction> findByWalletIdAndTxTypeAndSearchAndToDate(
            @Param("walletId") String walletId,
            @Param("txType") WalletTxType txType,
            @Param("search") String search,
            @Param("toDate") Instant toDate,
            Pageable pageable);

    // Query với search và date range
    @Query("SELECT wt FROM WalletTransaction wt WHERE wt.wallet.walletId = :walletId " +
           "AND (:txType IS NULL OR wt.txType = :txType) " +
           "AND (:search IS NULL OR LOWER(wt.walletTxId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.contractId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.milestoneId) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(wt.bookingId) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND wt.createdAt >= :fromDate AND wt.createdAt <= :toDate " +
           "ORDER BY wt.createdAt DESC")
    Page<WalletTransaction> findByWalletIdAndTxTypeAndSearchAndDateRange(
            @Param("walletId") String walletId,
            @Param("txType") WalletTxType txType,
            @Param("search") String search,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable);

    List<WalletTransaction> findByContractId(String contractId);

    List<WalletTransaction> findByMilestoneId(String milestoneId);

    List<WalletTransaction> findByBookingId(String bookingId);
    
    // Find transaction by walletTxId
    Optional<WalletTransaction> findByWalletTxId(String walletTxId);
    
    // Check if transaction already has refund
    Optional<WalletTransaction> findByRefundOfWalletTx_WalletTxId(String walletTxId);
}

