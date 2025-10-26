package com.mutrapro.identity_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import com.mutrapro.shared.enums.Role;
import jakarta.persistence.*;
import lombok.*;

/**
 * User Profile Entity - chỉ chứa thông tin hồ sơ (không chứa credential)
 * Bảng: users_profile
 */
@Entity
@Table(name = "users_profile")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    private String userId;
    
    @Column(unique = true, nullable = false, length = 100)
    private String email;
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 100)
    private Role role;
    
    @Column(name = "phone", length = 20)
    private String phone;
    
    @Column(columnDefinition = "TEXT")
    private String address;
    
    @Builder.Default
    @Column(name = "is_active")
    private boolean isActive = true;
}

