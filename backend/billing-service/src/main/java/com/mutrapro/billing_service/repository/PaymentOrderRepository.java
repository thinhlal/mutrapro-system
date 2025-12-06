package com.mutrapro.billing_service.repository;

import com.mutrapro.billing_service.entity.PaymentOrder;
import com.mutrapro.billing_service.enums.PaymentOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentOrderRepository extends JpaRepository<PaymentOrder, String> {

    Optional<PaymentOrder> findByVirtualAccount(String virtualAccount);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT po FROM PaymentOrder po WHERE po.paymentOrderId = :paymentOrderId")
    Optional<PaymentOrder> findByIdWithLock(@Param("paymentOrderId") String paymentOrderId);

    List<PaymentOrder> findByWallet_WalletIdAndStatusOrderByCreatedAtDesc(
            String walletId, PaymentOrderStatus status);

    List<PaymentOrder> findByStatusAndExpiresAtBefore(PaymentOrderStatus status, LocalDateTime now);

    List<PaymentOrder> findByStatusAndExpiresAtAfter(PaymentOrderStatus status, LocalDateTime now);

    @Query("SELECT po FROM PaymentOrder po WHERE po.wallet.walletId = :walletId ORDER BY po.createdAt DESC")
    List<PaymentOrder> findByWallet_WalletIdOrderByCreatedAtDesc(@Param("walletId") String walletId);
}

