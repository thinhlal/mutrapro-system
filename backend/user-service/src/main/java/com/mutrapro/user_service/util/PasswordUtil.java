package com.mutrapro.user_service.util;

import com.mutrapro.user_service.dto.request.ChangePasswordRequest;
import com.mutrapro.user_service.dto.request.ResetPasswordRequest;
import com.mutrapro.user_service.entity.User;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Utility class cho password operations
 */
@Component
public class PasswordUtil {

    /**
     * Set password reset token cho user từ ResetPasswordRequest
     */
    public void setPasswordResetToken(User user, ResetPasswordRequest request) {
        if (user == null || request == null) {
            return;
        }

        String token = UUID.randomUUID().toString();
        LocalDateTime expires = LocalDateTime.now().plusHours(24); // 24 hours

        user.setPasswordResetToken(token);
        user.setPasswordResetExpires(expires);
    }

    /**
     * Generate password reset token cho user
     */
    public String generatePasswordResetToken(User user) {
        if (user == null) {
            return null;
        }

        String token = UUID.randomUUID().toString();
        LocalDateTime expires = LocalDateTime.now().plusHours(24); // 24 hours

        user.setPasswordResetToken(token);
        user.setPasswordResetExpires(expires);

        return token;
    }

    /**
     * Clear password reset token
     */
    public void clearPasswordResetToken(User user) {
        if (user != null) {
            user.clearPasswordResetToken();
        }
    }

    /**
     * Validate change password request
     */
    public boolean isValidChangePasswordRequest(ChangePasswordRequest request) {
        if (request == null) {
            return false;
        }

        // Check if new password matches confirm password
        return request.getNewPassword() != null && 
               request.getConfirmPassword() != null &&
               request.getNewPassword().equals(request.getConfirmPassword());
    }

    /**
     * Update user password (hash will be done in service layer)
     */
    public void updateUserPassword(User user, String newPasswordHash) {
        if (user != null && newPasswordHash != null) {
            user.setPasswordHash(newPasswordHash);
            user.clearPasswordResetToken();
        }
    }

    /**
     * Check if password reset token is valid
     */
    public boolean isPasswordResetTokenValid(User user) {
        return user != null && user.isPasswordResetTokenValid();
    }
}
