package com.mutrapro.billing_service.repository;

import com.mutrapro.billing_service.entity.WithdrawalRequest;
import com.mutrapro.billing_service.enums.WithdrawalStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, String> {

    List<WithdrawalRequest> findByWallet_WalletIdOrderByCreatedAtDesc(String walletId);

    Page<WithdrawalRequest> findByWallet_WalletIdOrderByCreatedAtDesc(String walletId, Pageable pageable);

    Page<WithdrawalRequest> findByStatusOrderByCreatedAtDesc(WithdrawalStatus status, Pageable pageable);

    Page<WithdrawalRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT wr FROM WithdrawalRequest wr WHERE wr.wallet.walletId = :walletId " +
           "AND wr.status = :status ORDER BY wr.createdAt DESC")
    Page<WithdrawalRequest> findByWalletIdAndStatus(
            @Param("walletId") String walletId,
            @Param("status") WithdrawalStatus status,
            Pageable pageable);

    Optional<WithdrawalRequest> findByWithdrawalRequestId(String withdrawalRequestId);
}

