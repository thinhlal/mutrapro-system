package com.mutrapro.user_service.util;

import com.mutrapro.user_service.entity.User;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Utility class cho email verification operations
 */
@Component
public class EmailVerificationUtil {

    /**
     * Generate email verification token cho user
     */
    public String generateEmailVerificationToken(User user) {
        if (user == null) {
            return null;
        }

        String token = UUID.randomUUID().toString();
        LocalDateTime expires = LocalDateTime.now().plusDays(7); // 7 days

        user.setEmailVerificationToken(token);
        user.setEmailVerificationExpires(expires);

        return token;
    }

    /**
     * Set email verification token cho user
     */
    public void setEmailVerificationToken(User user, String token) {
        if (user != null && token != null) {
            LocalDateTime expires = LocalDateTime.now().plusDays(7); // 7 days
            user.setEmailVerificationToken(token);
            user.setEmailVerificationExpires(expires);
        }
    }

    /**
     * Clear email verification token
     */
    public void clearEmailVerificationToken(User user) {
        if (user != null) {
            user.clearEmailVerificationToken();
        }
    }

    /**
     * Mark email as verified
     */
    public void markEmailAsVerified(User user) {
        if (user != null) {
            user.markEmailAsVerified();
        }
    }

    /**
     * Check if email verification token is valid
     */
    public boolean isEmailVerificationTokenValid(User user) {
        return user != null && user.isEmailVerificationTokenValid();
    }

    /**
     * Generate email verification URL
     */
    public String generateEmailVerificationUrl(String baseUrl, String token) {
        if (baseUrl == null || token == null) {
            return null;
        }

        return baseUrl + "/api/users/verify-email?token=" + token;
    }

    /**
     * Check if user needs email verification
     */
    public boolean requiresEmailVerification(User user) {
        return user != null && !user.isEmailVerified();
    }
}
