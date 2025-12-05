package com.mutrapro.identity_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mutrapro.identity_service.dto.request.ResetPasswordRequest;
import com.mutrapro.identity_service.entity.OutboxEvent;
import com.mutrapro.identity_service.entity.UsersAuth;
import com.mutrapro.identity_service.exception.*;
import com.mutrapro.identity_service.repository.OutboxEventRepository;
import com.mutrapro.identity_service.repository.UsersAuthRepository;
import com.mutrapro.identity_service.repository.UserRepository;
import com.mutrapro.shared.event.PasswordResetEvent;
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
public class PasswordResetService {

    private final UsersAuthRepository usersAuthRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    @NonFinal
    @Value("${verification.password-reset.expiry-hours:24}")
    private Long passwordResetExpiryHours;

    /**
     * Tạo password reset token và gửi email
     */
    @Transactional
    public void forgotPassword(String email) {
        log.info("Processing forgot password request for email: {}", email);

        // Tìm user auth
        UsersAuth usersAuth = usersAuthRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("User not found for email: {}", email);
                    return UserNotFoundException.byEmail(email);
                });

        // Generate reset token
        String resetToken = generateResetToken();
        String tokenHash = passwordEncoder.encode(resetToken);
        LocalDateTime expiresAt = LocalDateTime.now().plusHours(passwordResetExpiryHours);

        // Update reset token vào UsersAuth
        usersAuth.setPasswordResetTokenHash(tokenHash);
        usersAuth.setPasswordResetTokenExpiresAt(expiresAt);
        usersAuthRepository.save(usersAuth);

        // Lấy full name từ User
        String fullName = userRepository.findById(usersAuth.getUserId())
                .map(user -> user.getFullName())
                .orElse(usersAuth.getEmail());

        // Publish event qua Kafka
        PasswordResetEvent event = PasswordResetEvent.builder()
                .eventId(UUID.randomUUID())
                .email(email)
                .fullName(fullName)
                .resetToken(resetToken)
                .expiryHours(passwordResetExpiryHours)
                .timestamp(LocalDateTime.now())
                .build();

        publishPasswordResetEvent(event, usersAuth.getUserId());

        log.info("Password reset token generated successfully for user: {}", usersAuth.getUserId());
    }

    /**
     * Reset password với token
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.info("Processing password reset request for email: {}", request.getEmail());

        // Validate passwords match
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw WeakPasswordException.doNotMatch();
        }

        // Validate password strength
        if (request.getNewPassword().length() < 8) {
            throw WeakPasswordException.atLeast(8);
        }

        // Tìm user auth by email
        UsersAuth usersAuth = usersAuthRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("User not found for email: {}", request.getEmail());
                    return UserNotFoundException.byEmail(request.getEmail());
                });

        // Check token exists and not expired
        LocalDateTime now = LocalDateTime.now();
        if (usersAuth.getPasswordResetTokenHash() == null || 
            usersAuth.getPasswordResetTokenExpiresAt() == null ||
            usersAuth.getPasswordResetTokenExpiresAt().isBefore(now)) {
            throw PasswordResetTokenExpiredException.create();
        }

        // Verify token
        boolean isValid = passwordEncoder.matches(request.getToken(), usersAuth.getPasswordResetTokenHash());
        if (!isValid) {
            log.warn("Invalid reset token for user: {}", usersAuth.getUserId());
            throw PasswordResetTokenInvalidException.create();
        }

        // Update password và clear reset token
        usersAuth.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        usersAuth.setPasswordResetTokenHash(null);
        usersAuth.setPasswordResetTokenExpiresAt(null);
        usersAuthRepository.save(usersAuth);

        log.info("Password reset successfully for user: {}", usersAuth.getUserId());
    }

    /**
     * Generate secure random reset token
     */
    private String generateResetToken() {
        StringBuilder token = new StringBuilder();
        for (int i = 0; i < 32; i++) {
            int randomIndex = secureRandom.nextInt(62);
            if (randomIndex < 10) {
                token.append((char) ('0' + randomIndex));
            } else if (randomIndex < 36) {
                token.append((char) ('A' + randomIndex - 10));
            } else {
                token.append((char) ('a' + randomIndex - 36));
            }
        }
        return token.toString();
    }

    /**
     * Publish password reset event to Kafka via Outbox pattern
     */
    private void publishPasswordResetEvent(PasswordResetEvent event, String userId) {
        try {
            JsonNode eventJson = objectMapper.valueToTree(event);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateId(UUID.fromString(userId))
                    .aggregateType("user")
                    .eventType("password.reset")
                    .eventPayload(eventJson)
                    .occurredAt(LocalDateTime.now())
                    .build();

            outboxEventRepository.save(outboxEvent);
            log.info("Password reset event published to outbox: {}", event.getEventId());
        } catch (Exception e) {
            log.error("Failed to publish password reset event", e);
            throw new RuntimeException("Failed to publish password reset event", e);
        }
    }
}

