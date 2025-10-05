package com.mutrapro.user_service.entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.mutrapro.shared.enums.Role;

import java.time.LocalDateTime;

/**
 * User Profile Entity - chỉ chứa thông tin hồ sơ (không chứa credential)
 * Bảng: users_profile
 */
@Entity
@Table(name = "users_profile")
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
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    
}
