package com.mutrapro.specialist_service.util;

import com.mutrapro.specialist_service.exception.UserNotAuthenticatedException;
import com.mutrapro.specialist_service.exception.UserIdNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

public class SecurityUtils {
    
    /**
     * Get current authenticated user's email
     */
    public static String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw UserNotAuthenticatedException.create();
        }
        return authentication.getName();
    }
    
    /**
     * Get current authenticated user's ID from JWT claims
     * Note: This assumes the JWT contains a "userId" claim or "sub" claim
     * You may need to adjust based on your JWT structure
     */
    public static String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw UserNotAuthenticatedException.create();
        }
        
        // Try to extract userId from JWT claims
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            // Try "userId" claim first
            if (jwt.hasClaim("userId")) {
                return jwt.getClaimAsString("userId");
            }
            // Fallback to "sub" claim (subject)
            if (jwt.hasClaim("sub")) {
                return jwt.getClaimAsString("sub");
            }
        }
        
        // Fallback to email if userId not found in JWT
        // This might require a lookup in identity-service
        throw UserIdNotFoundException.create();
    }
}

