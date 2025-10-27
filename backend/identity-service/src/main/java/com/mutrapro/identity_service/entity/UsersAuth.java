package com.mutrapro.identity_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import com.mutrapro.shared.enums.Role;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users_auth")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsersAuth extends BaseEntity<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    private String userId;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "active";

    @Column(name = "email_verified")
    @Builder.Default
    private boolean emailVerified = false;
    
    // Convenience methods
    public boolean isActive() {
        return "active".equals(status);
    }
    
    public void setActive(boolean active) {
        this.status = active ? "active" : "inactive";
    }
    
    public boolean isVerified() {
        return emailVerified;
    }
    
    public void setVerified(boolean verified) {
        this.emailVerified = verified;
    }
}


