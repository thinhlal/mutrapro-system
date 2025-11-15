package com.mutrapro.specialist_service.util;

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
            throw new RuntimeException("User not authenticated");
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
            throw new RuntimeException("User not authenticated");
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
        throw new RuntimeException("User ID not found in JWT token. Please ensure JWT contains 'userId' or 'sub' claim.");
    }
}

