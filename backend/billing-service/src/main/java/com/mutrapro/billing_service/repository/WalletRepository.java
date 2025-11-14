package com.mutrapro.billing_service.repository;

import com.mutrapro.billing_service.entity.Wallet;

import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, String> {

    Optional<Wallet> findByUserId(String userId);

    boolean existsByUserId(String userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.walletId = :walletId")
    Optional<Wallet> findByIdWithLock(@Param("walletId") String walletId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.userId = :userId")
    Optional<Wallet> findByUserIdWithLock(@Param("userId") String userId);

    @Query("SELECT w FROM Wallet w WHERE (:userId IS NULL OR w.userId = :userId)")
    Page<Wallet> findAllByUserId(
            @Param("userId") String userId,
            org.springframework.data.domain.Pageable pageable);
}

