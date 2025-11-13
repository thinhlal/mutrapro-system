package com.mutrapro.project_service.entity;

import com.mutrapro.project_service.enums.SignSessionStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Entity
@Table(name = "contract_sign_sessions", indexes = {
    @Index(name = "idx_sign_sessions_contract_id", columnList = "contract_id"),
    @Index(name = "idx_sign_sessions_user_id", columnList = "user_id"),
    @Index(name = "idx_sign_sessions_expire_at", columnList = "expire_at"),
    @Index(name = "idx_sign_sessions_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ContractSignSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "session_id", nullable = false)
    String sessionId;

    @Column(name = "contract_id", nullable = false, length = 36)
    String contractId;

    @Column(name = "user_id", nullable = false, length = 36)
    String userId;

    @Column(name = "signature_temp_base64", columnDefinition = "TEXT")
    String signatureTempBase64;  // Temporary signature before OTP verification

    @Column(name = "otp_code", nullable = false, length = 10)
    String otpCode;  // 6-digit OTP

    @Column(name = "expire_at", nullable = false)
    Instant expireAt;  // OTP expiration time (5 minutes from creation)

    @Builder.Default
    @Column(name = "attempt_count", nullable = false)
    Integer attemptCount = 0;  // Max 3 attempts

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    SignSessionStatus status = SignSessionStatus.PENDING;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    Instant updatedAt;

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = Instant.now();
    }
}

