package com.mutrapro.identity_service.repository;

import com.mutrapro.identity_service.entity.EmailVerification;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, String> {

    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailVerification e SET e.status = com.mutrapro.identity_service.enums.VerificationStatus.EXPIRED " +
           "WHERE e.expiresAt < :now AND e.status = com.mutrapro.identity_service.enums.VerificationStatus.PENDING")
    int markExpired(@Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM EmailVerification e WHERE e.status = com.mutrapro.identity_service.enums.VerificationStatus.EXPIRED " +
           "AND e.expiresAt < :cutoff")
    int deleteExpiredOlderThan(@Param("cutoff") LocalDateTime cutoff);
    
    // Find active verification by userId
    @Query(value = "SELECT * FROM email_verifications WHERE user_id = :userId " +
           "AND status = 'PENDING' AND expires_at > :now ORDER BY expires_at DESC LIMIT 1",
           nativeQuery = true)
    Optional<EmailVerification> findActiveByUserId(@Param("userId") String userId, @Param("now") LocalDateTime now);
}

