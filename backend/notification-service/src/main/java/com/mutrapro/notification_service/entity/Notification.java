package com.mutrapro.notification_service.entity;

import com.mutrapro.shared.enums.NotificationType;
import com.mutrapro.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

/**
 * Notification entity - Lưu trữ thông báo trong hệ thống
 */
@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(name = "idx_user_created", columnList = "user_id, created_at DESC"),
        @Index(name = "idx_user_unread", columnList = "user_id, is_read")
    }
)
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Notification extends BaseEntity<String> {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notification_id")
    String notificationId;
    
    @Column(name = "user_id", nullable = false)
    String userId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    NotificationType type;
    
    @Column(name = "title", nullable = false)
    String title;
    
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    String content;
    
    // Reference to related entity
    @Column(name = "reference_id")
    String referenceId;
    
    @Column(name = "reference_type", length = 50)
    String referenceType;
    
    @Column(name = "action_url", length = 500)
    String actionUrl;
    
    // Read status
    @Column(name = "is_read")
    @Builder.Default
    Boolean isRead = false;
    
    @Column(name = "read_at")
    LocalDateTime readAt;
    
    public String getId() {
        return notificationId;
    }
}

