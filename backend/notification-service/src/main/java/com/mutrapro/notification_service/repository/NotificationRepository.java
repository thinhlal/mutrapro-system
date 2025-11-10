package com.mutrapro.notification_service.repository;

import com.mutrapro.notification_service.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Notification entity
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    
    /**
     * Get notifications for user (paginated, ordered by created date)
     */
    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    
    /**
     * Count unread notifications for user
     */
    long countByUserIdAndIsReadFalse(String userId);
    
    /**
     * Get unread notifications for user
     */
    List<Notification> findByUserIdAndIsReadFalse(String userId);
    
    /**
     * Find notification by ID and user ID (for security)
     */
    Optional<Notification> findByNotificationIdAndUserId(String notificationId, String userId);
    
    /**
     * Get latest N notifications for user
     */
    @Query("SELECT n FROM Notification n WHERE n.userId = :userId ORDER BY n.createdAt DESC")
    List<Notification> findTopNByUserId(@Param("userId") String userId, Pageable pageable);
}

