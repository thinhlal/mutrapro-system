package com.mutrapro.user_service.entity;

import com.mutrapro.user_service.enums.UserRole;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

/**
 * User Entity - Data model cho User trong database
 * Dựa theo ERD: Table users trong MuTraPro_ERD.dbml
 */
@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    private String userId;
    
    @Column(unique = true, nullable = false, length = 50)
    private String username;
    
    @Column(unique = true, nullable = false, length = 100)
    private String email;
    
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;
    
    @Column(name = "phone", length = 20)
    private String phone;
    
    @Column(columnDefinition = "TEXT")
    private String address;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "primary_role")
    private UserRole primaryRole;
    
    @Builder.Default
    @Column(name = "is_active")
    private boolean isActive = true;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // ===== LOGIN & SECURITY FIELDS =====
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
    @Column(name = "failed_login_attempts")
    @Builder.Default
    private int failedLoginAttempts = 0;
    
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;
    
    @Builder.Default
    private boolean locked = false;
    
    // ===== EMAIL VERIFICATION FIELDS =====
    @Builder.Default
    @Column(name = "email_verified")
    private boolean emailVerified = false;
    
    @Column(name = "email_verification_token")
    private String emailVerificationToken;
    
    @Column(name = "email_verification_expires")
    private LocalDateTime emailVerificationExpires;
    
    // ===== PASSWORD RESET FIELDS =====
    @Column(name = "password_reset_token")
    private String passwordResetToken;
    
    @Column(name = "password_reset_expires")
    private LocalDateTime passwordResetExpires;
    
    // Relationship với user_roles
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<com.mutrapro.user_service.entity.UserRole> userRoles;
    
    // ===== BUSINESS METHODS =====
    
    // Account status methods
    public boolean isAccountActive() {
        return isActive;
    }
    
    public void activateAccount() {
        this.isActive = true;
    }
    
    public void deactivateAccount() {
        this.isActive = false;
    }
    
    public boolean isAccountNonLocked() {
        return !locked && (lockedUntil == null || lockedUntil.isBefore(LocalDateTime.now()));
    }
    
    public boolean isAccountNonExpired() {
        return true; // Implement if needed
    }
    
    public boolean isCredentialsNonExpired() {
        return true; // Implement if needed
    }
    
    // Login & Security methods
    public void incrementFailedLoginAttempts() {
        this.failedLoginAttempts++;
    }
    
    public void resetFailedLoginAttempts() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }
    
    public void lockAccount(LocalDateTime until) {
        this.locked = true;
        this.lockedUntil = until;
    }
    
    public void unlockAccount() {
        this.locked = false;
        this.lockedUntil = null;
        this.failedLoginAttempts = 0;
    }
    
    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }
    
    // Email verification methods
    public boolean isEmailVerificationTokenValid() {
        return emailVerificationToken != null && 
               emailVerificationExpires != null && 
               emailVerificationExpires.isAfter(LocalDateTime.now());
    }
    
    public void setEmailVerificationToken(String token, LocalDateTime expires) {
        this.emailVerificationToken = token;
        this.emailVerificationExpires = expires;
    }
    
    public void clearEmailVerificationToken() {
        this.emailVerificationToken = null;
        this.emailVerificationExpires = null;
    }
    
    public void markEmailAsVerified() {
        this.emailVerified = true;
        clearEmailVerificationToken();
    }
    
    // Password reset methods
    public boolean isPasswordResetTokenValid() {
        return passwordResetToken != null && 
               passwordResetExpires != null && 
               passwordResetExpires.isAfter(LocalDateTime.now());
    }
    
    public void setPasswordResetToken(String token, LocalDateTime expires) {
        this.passwordResetToken = token;
        this.passwordResetExpires = expires;
    }
    
    public void clearPasswordResetToken() {
        this.passwordResetToken = null;
        this.passwordResetExpires = null;
    }
    
    // Role management methods
    public boolean hasRole(com.mutrapro.user_service.enums.UserRole role) {
        return userRoles != null && 
               userRoles.stream()
                       .anyMatch(userRole -> userRole.getRole() == role && userRole.isActive());
    }
    
    public void addRole(com.mutrapro.user_service.enums.UserRole role, User assignedBy) {
        if (!hasRole(role)) {
            com.mutrapro.user_service.entity.UserRole userRoleEntity = com.mutrapro.user_service.entity.UserRole.builder()
                    .user(this)
                    .role(role)
                    .assignedBy(assignedBy)
                    .isActive(true)
                    .build();
            this.userRoles.add(userRoleEntity);
        }
    }
    
    public void removeRole(com.mutrapro.user_service.enums.UserRole role) {
        if (userRoles != null) {
            userRoles.removeIf(userRole -> 
                userRole.getRole() == role && 
                userRole.isActive() && 
                userRole.getRole() != primaryRole);
        }
    }
}
