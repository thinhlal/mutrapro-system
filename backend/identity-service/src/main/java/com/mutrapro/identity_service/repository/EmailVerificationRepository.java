package com.mutrapro.identity_service.repository;

import com.mutrapro.identity_service.entity.EmailVerification;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, String> {

    @Modifying(clearAutomatically = true)
    @Query("UPDATE EmailVerification e SET e.status = com.mutrapro.identity_service.enums.VerificationStatus.EXPIRED " +
           "WHERE e.expiresAt < :now AND e.status = com.mutrapro.identity_service.enums.VerificationStatus.PENDING")
    int markExpired(@Param("now") Instant now);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM EmailVerification e WHERE e.status = com.mutrapro.identity_service.enums.VerificationStatus.EXPIRED " +
           "AND e.expiresAt < :cutoff")
    int deleteExpiredOlderThan(@Param("cutoff") Instant cutoff);
}

