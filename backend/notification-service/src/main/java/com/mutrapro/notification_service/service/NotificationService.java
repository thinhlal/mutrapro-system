package com.mutrapro.notification_service.service;

import com.mutrapro.notification_service.entity.Notification;
import com.mutrapro.notification_service.mapper.NotificationMapper;
import com.mutrapro.shared.enums.NotificationType;
import com.mutrapro.notification_service.repository.NotificationRepository;
import com.mutrapro.notification_service.dto.response.NotificationResponse;
import com.mutrapro.notification_service.exception.NotificationNotFoundException;
import com.mutrapro.shared.event.ChatRoomCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Service để quản lý notifications
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Tạo notification cho chat room mới (từ Kafka event)
     */
    @Transactional
    public void createChatRoomNotifications(ChatRoomCreatedEvent event) {
        if (event.getParticipantIds() == null || event.getParticipantIds().length == 0) {
            log.warn("No participants in event: eventId={}, roomId={}", 
                    event.getEventId(), event.getRoomId());
            return;
        }
        
        log.info("Creating notifications for chat room: roomId={}, participants={}", 
                event.getRoomId(), event.getParticipantIds().length);
        
        for (String participantId : event.getParticipantIds()) {
            try {
                // Tạo notification
                Notification notification = Notification.builder()
                        .userId(participantId)
                        .type(NotificationType.CHAT_ROOM_CREATED)
                        .title("Cuộc trò chuyện mới")
                        .content(String.format(
                            "Bạn đã được thêm vào cuộc trò chuyện '%s'", 
                            event.getRoomName()
                        ))
                        .referenceId(event.getRoomId())
                        .referenceType("CHAT_ROOM")
                        .actionUrl("/chat/" + event.getRoomId())
                        .isRead(false)
                        .build();
                
                Notification saved = notificationRepository.save(notification);
                
                // Gửi real-time qua WebSocket
                sendRealTimeNotification(participantId, saved);
                
                log.debug("Notification created and sent: notificationId={}, userId={}", 
                        saved.getNotificationId(), participantId);
            } catch (Exception e) {
                log.error("Failed to create notification for user: userId={}, error={}", 
                        participantId, e.getMessage(), e);
                // Continue với participants khác
            }
        }
    }

    
    /**
     * Tạo notification mới (từ API call)
     */
    @Transactional
    public NotificationResponse createNotification(String userId, NotificationType type, 
                                                   String title, String content,
                                                   String referenceId, String referenceType, 
                                                   String actionUrl) {
        log.info("Creating notification: userId={}, type={}, title={}", userId, type, title);
        
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .content(content)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();
        
        Notification saved = notificationRepository.save(notification);
        
        // Gửi real-time qua WebSocket
        sendRealTimeNotification(userId, saved);
        
        log.info("Notification created: notificationId={}, userId={}", 
                saved.getNotificationId(), userId);
        
        return notificationMapper.toResponse(saved);
    }
    
    /**
     * Get notifications cho user (paginated)
     */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return notifications.map(notificationMapper::toResponse);
    }
    
    /**
     * Get latest N notifications for user
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getLatestNotifications(String userId, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<Notification> notifications = notificationRepository.findTopNByUserId(userId, pageable);
        return notifications.stream()
                .map(notificationMapper::toResponse)
                .toList();
    }
    
    /**
     * Get unread count
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
    
    /**
     * Mark notification as read
     */
    @Transactional
    public void markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository
                .findByNotificationIdAndUserId(notificationId, userId)
                .orElseThrow(() -> NotificationNotFoundException.byIdAndUserId(notificationId, userId));
        
        if (!notification.getIsRead()) {
            notification.setIsRead(true);
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
            
            log.info("Notification marked as read: notificationId={}, userId={}", 
                    notificationId, userId);
        }
    }
    
    /**
     * Mark all notifications as read
     */
    @Transactional
    public int markAllAsRead(String userId) {
        List<Notification> unreadNotifications = notificationRepository.findByUserIdAndIsReadFalse(userId);
        
        if (unreadNotifications.isEmpty()) {
            return 0;
        }
        
        Instant now = Instant.now();
        unreadNotifications.forEach(n -> {
            n.setIsRead(true);
            n.setReadAt(now);
        });
        
        notificationRepository.saveAll(unreadNotifications);
        
        log.info("All notifications marked as read: userId={}, count={}", 
                userId, unreadNotifications.size());
        
        return unreadNotifications.size();
    }

    /**
     * Gửi notification real-time qua WebSocket
     */
    private void sendRealTimeNotification(String userId, Notification notification) {
        try {
            NotificationResponse response = notificationMapper.toResponse(notification);
            
            // Gửi đến user-specific queue
            messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/notifications",
                response
            );
            
            log.debug("Real-time notification sent: userId={}, notificationId={}", 
                    userId, notification.getNotificationId());
        } catch (Exception e) {
            log.error("Failed to send real-time notification: userId={}, error={}", 
                    userId, e.getMessage(), e);
            // Không throw exception - notification đã được lưu vào DB
        }
    }
}

