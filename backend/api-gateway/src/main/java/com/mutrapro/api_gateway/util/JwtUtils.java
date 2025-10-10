package com.mutrapro.api_gateway.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

/**
 * JWT Utility class cho API Gateway
 * Cung cấp các phương thức để xử lý JWT token
 */
@Slf4j
@Component
public class JwtUtils {

    @Value("${jwt.signerKey}")
    private String signerKey;

    /**
     * Extract username từ JWT token
     */
    public String extractUsername(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getSubject();
        } catch (Exception e) {
            log.error("Error extracting username from token: ", e);
            return null;
        }
    }

    /**
     * Extract email từ JWT token
     */
    public String extractEmail(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.get("email", String.class);
        } catch (Exception e) {
            log.error("Error extracting email from token: ", e);
            return null;
        }
    }

    /**
     * Extract roles từ JWT token
     */
    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        try {
            Claims claims = extractAllClaims(token);
            Object scopeClaim = claims.get("scope");
            
            if (scopeClaim instanceof String) {
                return List.of((String) scopeClaim);
            } else if (scopeClaim instanceof List) {
                return (List<String>) scopeClaim;
            }
            
            return List.of();
        } catch (Exception e) {
            log.error("Error extracting roles from token: ", e);
            return List.of();
        }
    }

    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = extractAllClaims(token);
            Date expiration = claims.getExpiration();
            return expiration.before(new Date());
        } catch (Exception e) {
            log.error("Error checking token expiration: ", e);
            return true;
        }
    }

    /**
     * Validate JWT token
     */
    public boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return !isTokenExpired(token);
        } catch (Exception e) {
            log.error("Error validating token: ", e);
            return false;
        }
    }

    /**
     * Extract all claims từ JWT token
     */
    private Claims extractAllClaims(String token) {
        SecretKey key = Keys.hmacShaKeyFor(signerKey.getBytes(StandardCharsets.UTF_8));
        
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extract user ID từ JWT token
     */
    public Long extractUserId(String token) {
        try {
            Claims claims = extractAllClaims(token);
            Object userIdClaim = claims.get("userId");
            
            if (userIdClaim instanceof Integer) {
                return ((Integer) userIdClaim).longValue();
            } else if (userIdClaim instanceof Long) {
                return (Long) userIdClaim;
            }
            
            return null;
        } catch (Exception e) {
            log.error("Error extracting user ID from token: ", e);
            return null;
        }
    }

    /**
     * Extract token type từ JWT token
     */
    public String extractTokenType(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.get("tokenType", String.class);
        } catch (Exception e) {
            log.error("Error extracting token type from token: ", e);
            return null;
        }
    }

    /**
     * Get token expiration time
     */
    public Date getTokenExpiration(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getExpiration();
        } catch (Exception e) {
            log.error("Error getting token expiration: ", e);
            return null;
        }
    }

    /**
     * Get token issued time
     */
    public Date getTokenIssuedAt(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getIssuedAt();
        } catch (Exception e) {
            log.error("Error getting token issued time: ", e);
            return null;
        }
    }
}
