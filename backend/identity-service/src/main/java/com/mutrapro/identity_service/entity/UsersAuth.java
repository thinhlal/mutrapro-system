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
    @Column(name = "id")
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 100)
    private Role role;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "is_active")
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_verified")
    @Builder.Default
    private boolean isVerified = false;
}


