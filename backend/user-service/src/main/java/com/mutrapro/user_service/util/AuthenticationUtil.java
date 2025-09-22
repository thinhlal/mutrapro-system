package com.mutrapro.user_service.util;

import com.mutrapro.user_service.entity.User;
import org.springframework.stereotype.Component;

/**
 * Utility class cho authentication operations
 */
@Component
public class AuthenticationUtil {

    /**
     * Check if this is user's first login
     */
    public boolean isFirstLogin(User user) {
        return user != null && user.getLastLoginAt() == null;
    }

    /**
     * Check if user requires email verification
     */
    public boolean requiresEmailVerification(User user) {
        return user != null && !user.isEmailVerified();
    }

    /**
     * Update last login time for user
     */
    public void updateLastLogin(User user) {
        if (user != null) {
            user.updateLastLogin();
        }
    }

    /**
     * Check if user account is locked
     */
    public boolean isAccountLocked(User user) {
        return user != null && user.isLocked();
    }

    /**
     * Check if user account is active
     */
    public boolean isAccountActive(User user) {
        return user != null && user.isAccountActive();
    }

    /**
     * Increment failed login attempts
     */
    public void incrementFailedLoginAttempts(User user) {
        if (user != null) {
            user.incrementFailedLoginAttempts();
        }
    }

    /**
     * Reset failed login attempts
     */
    public void resetFailedLoginAttempts(User user) {
        if (user != null) {
            user.resetFailedLoginAttempts();
        }
    }

    /**
     * Lock user account until specified time
     */
    public void lockAccount(User user, java.time.LocalDateTime until) {
        if (user != null && until != null) {
            user.lockAccount(until);
        }
    }

    /**
     * Unlock user account
     */
    public void unlockAccount(User user) {
        if (user != null) {
            user.unlockAccount();
        }
    }

    /**
     * Check if user can login (account active, not locked, not expired)
     */
    public boolean canLogin(User user) {
        return user != null && 
               user.isAccountActive() && 
               user.isAccountNonLocked() && 
               user.isAccountNonExpired() && 
               user.isCredentialsNonExpired();
    }
}
