package com.mutrapro.auth_service.entity;

import com.mutrapro.auth_service.enums.VerificationStatus;
import com.mutrapro.auth_service.enums.VerificationChannel;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "email_verifications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerification extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, unique = true)
    private String id; // requestId (UUID)

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "otp_hash", nullable = false)
    private String otpHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 50)
    private VerificationChannel channel; // EMAIL_OTP

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private VerificationStatus status;

    @Column(name = "resent_of")
    private String resentOf; // old requestId if resend
}


