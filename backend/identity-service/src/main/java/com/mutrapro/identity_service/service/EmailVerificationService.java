package com.mutrapro.identity_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.identity_service.dto.response.ResendVerificationInfo;
import com.mutrapro.identity_service.dto.response.VerificationResponse;
import com.mutrapro.identity_service.dto.response.VerificationStatusResponse;
import com.mutrapro.identity_service.entity.EmailVerification;
import com.mutrapro.identity_service.entity.OutboxEvent;
import com.mutrapro.identity_service.entity.User;
import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.enums.VerificationChannel;
import com.mutrapro.identity_service.enums.VerificationStatus;
import com.mutrapro.identity_service.exception.EmailAlreadyVerifiedException;
import com.mutrapro.identity_service.exception.UserNotFoundException;
import com.mutrapro.identity_service.exception.VerificationCodeInvalidException;
import com.mutrapro.identity_service.repository.EmailVerificationRepository;
import com.mutrapro.identity_service.repository.OutboxEventRepository;
import com.mutrapro.identity_service.repository.UsersAuthRepository;
import com.mutrapro.shared.event.EmailVerificationEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(makeFinal = true, level = AccessLevel.PRIVATE)
public class EmailVerificationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final UsersAuthRepository usersAuthRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final com.mutrapro.identity_service.repository.UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    @NonFinal
    @Value("${verification.email-otp.expiry-seconds:900}")
    long otpExpirySeconds;

    /**
     * Verify email with OTP code
     */
    @Transactional
    public void verifyEmail(String code, String email) {
        log.info("Verifying email with code for email: {}", email);
        
        // Find user by email
        UsersAuth usersAuth = usersAuthRepository.findByEmail(email)
                .orElseThrow(() -> UserNotFoundException.byEmail(email));

        // Check if already verified
        if (usersAuth.isEmailVerified()) {
            throw EmailAlreadyVerifiedException.create();
        }

        // Find active verification for this user
        LocalDateTime now = LocalDateTime.now();
        EmailVerification verification = emailVerificationRepository.findActiveByUserId(usersAuth.getUserId(), now)
                .orElseThrow(() -> {
                    log.warn("No active verification found for user");
                    return VerificationCodeInvalidException.create();
                });

        // Verify the OTP code
        boolean isValid = passwordEncoder.matches(code, verification.getOtpHash());
        
        if (!isValid) {
            log.warn("Invalid verification code for user: {}", usersAuth.getUserId());
            throw VerificationCodeInvalidException.create();
        }

        // Mark verification as verified
        verification.setStatus(VerificationStatus.VERIFIED);
        emailVerificationRepository.save(verification);

        // Mark email as verified in UsersAuth
        usersAuth.setEmailVerified(true);
        usersAuthRepository.save(usersAuth);

        log.info("Email verified successfully for user: {}", usersAuth.getUserId());
    }

    /**
     * Resend verification code
     */
    @Transactional
    public VerificationResponse resendVerificationCode(String email) {
        log.info("Resending verification code for email: {}", email);

        UsersAuth usersAuth = usersAuthRepository.findByEmail(email)
                .orElseThrow(() -> UserNotFoundException.byEmail(email));

        // Check if already verified
        if (usersAuth.isEmailVerified()) {
            throw EmailAlreadyVerifiedException.create();
        }

        long expiresInSeconds = otpExpirySeconds;
        LocalDateTime now = LocalDateTime.now();

        // Generate new OTP
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        String otpHash = passwordEncoder.encode(otp);
        
        // Upsert: find existing or create new
        EmailVerification verification = emailVerificationRepository.findActiveByUserId(usersAuth.getUserId(), now)
                .orElse(EmailVerification.builder()
                        .userId(usersAuth.getUserId())
                        .otpHash(otpHash)
                        .channel(VerificationChannel.EMAIL_OTP)
                        .status(VerificationStatus.PENDING)
                        .build());
        
        // Always update OTP and expiry
        verification.setOtpHash(otpHash);
        verification.setExpiresAt(LocalDateTime.now().plusSeconds(expiresInSeconds));
        emailVerificationRepository.save(verification);

        // Get user full name
        String fullName = userRepository.findById(usersAuth.getUserId())
                .map(User::getFullName)
                .orElse(usersAuth.getEmail());
        
        // Save email verification event to outbox
        UUID eventId = UUID.randomUUID();
        EmailVerificationEvent emailEvent = EmailVerificationEvent.builder()
                .eventId(eventId)
                .email(usersAuth.getEmail())
                .otp(otp)
                .fullName(fullName)
                .timestamp(LocalDateTime.now())
                .build();

        JsonNode eventPayload = objectMapper.valueToTree(emailEvent);

        OutboxEvent outboxEvent = OutboxEvent.builder()
                .aggregateId(UUID.fromString(usersAuth.getUserId()))
                .aggregateType("user")
                .eventType("email.verification")
                .eventPayload(eventPayload)
                .occurredAt(LocalDateTime.now())
                .build();

        outboxEventRepository.save(outboxEvent);

        log.info("Verification code resent successfully for user: {}", usersAuth.getUserId());

        return VerificationResponse.builder()
                .message("Verification code sent successfully")
                .result(ResendVerificationInfo.builder()
                        .remainingSeconds(expiresInSeconds)
                        .build())
                .build();
    }

    /**
     * Get verification status
     */
    public VerificationStatusResponse getVerificationStatus(String email) {
        UsersAuth usersAuth = usersAuthRepository.findByEmail(email)
                .orElseThrow(() -> UserNotFoundException.byEmail(email));

        boolean emailVerified = usersAuth.isEmailVerified();

        // Check if there's an active verification code
        boolean hasActiveCode = false;
        Long remainingSeconds = 0L;
        
        if (!emailVerified) {
            LocalDateTime now = LocalDateTime.now();
            var activeVerification = emailVerificationRepository.findActiveByUserId(usersAuth.getUserId(), now);
            
            if (activeVerification.isPresent()) {
                hasActiveCode = true;
                LocalDateTime expiresAt = activeVerification.get().getExpiresAt();
                remainingSeconds = ChronoUnit.SECONDS.between(now, expiresAt);
                if (remainingSeconds < 0) {
                    remainingSeconds = 0L;
                }
            }
        }

        return VerificationStatusResponse.builder()
                .emailVerified(emailVerified)
                .hasActiveCode(hasActiveCode)
                .remainingSeconds(remainingSeconds)
                .build();
    }
}

