package com.mutrapro.identity_service.entity;

import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

/**
 * User Profile Entity - chỉ chứa thông tin hồ sơ (không chứa credential)
 * Bảng: users
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity<String> {
    
    @Id
    @Column(name = "user_id")
    private String userId; // UserId từ users_auth table
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;
    
    @Column(name = "phone", length = 20)
    private String phone;
    
    @Column(columnDefinition = "TEXT")
    private String address;
    
    @Builder.Default
    @Column(name = "is_active")
    private boolean isActive = true;
}

