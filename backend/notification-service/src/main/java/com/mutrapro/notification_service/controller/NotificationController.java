package com.mutrapro.notification_service.controller;

import com.mutrapro.notification_service.dto.request.CreateNotificationRequest;
import com.mutrapro.notification_service.dto.response.NotificationResponse;
import com.mutrapro.notification_service.dto.response.UnreadCountResponse;
import com.mutrapro.notification_service.service.NotificationService;
import com.mutrapro.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API for Notifications
 */
@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "API quản lý thông báo")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationController {
    
    NotificationService notificationService;
    
    /**
     * Get user notifications (paginated)
     */
    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo của user")
    public ApiResponse<Page<NotificationResponse>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        String userId = getCurrentUserId();
        log.info("Getting notifications: userId={}, page={}, size={}", userId, page, size);
        
        Page<NotificationResponse> notifications = notificationService.getUserNotifications(userId, page, size);
        
        return ApiResponse.<Page<NotificationResponse>>builder()
                .message("Notifications retrieved successfully")
                .data(notifications)
                .statusCode(200)
                .build();
    }
    
    /**
     * Get latest notifications (for dropdown)
     */
    @GetMapping("/latest")
    @Operation(summary = "Lấy danh sách thông báo mới nhất")
    public ApiResponse<List<NotificationResponse>> getLatestNotifications(
            @RequestParam(defaultValue = "10") int limit) {
        
        String userId = getCurrentUserId();
        log.info("Getting latest notifications: userId={}, limit={}", userId, limit);
        
        List<NotificationResponse> notifications = notificationService.getLatestNotifications(userId, limit);
        
        return ApiResponse.<List<NotificationResponse>>builder()
                .message("Latest notifications retrieved successfully")
                .data(notifications)
                .statusCode(200)
                .build();
    }
    
    /**
     * Get unread notification count
     */
    @GetMapping("/unread-count")
    @Operation(summary = "Lấy số lượng thông báo chưa đọc")
    public ApiResponse<UnreadCountResponse> getUnreadCount() {
        String userId = getCurrentUserId();
        long count = notificationService.getUnreadCount(userId);
        
        log.debug("Unread count: userId={}, count={}", userId, count);
        
        return ApiResponse.<UnreadCountResponse>builder()
                .message("Unread count retrieved successfully")
                .data(UnreadCountResponse.builder().count(count).build())
                .statusCode(200)
                .build();
    }
    
    /**
     * Mark notification as read
     */
    @PostMapping("/{notificationId}/read")
    @Operation(summary = "Đánh dấu thông báo đã đọc")
    public ApiResponse<Void> markAsRead(@PathVariable String notificationId) {
        String userId = getCurrentUserId();
        log.info("Marking notification as read: notificationId={}, userId={}", notificationId, userId);
        
        notificationService.markAsRead(notificationId, userId);
        
        return ApiResponse.<Void>builder()
                .message("Notification marked as read")
                .statusCode(200)
                .build();
    }
    
    /**
     * Mark all notifications as read
     */
    @PostMapping("/mark-all-read")
    @Operation(summary = "Đánh dấu tất cả thông báo đã đọc")
    public ApiResponse<Integer> markAllAsRead() {
        String userId = getCurrentUserId();
        log.info("Marking all notifications as read: userId={}", userId);
        
        int count = notificationService.markAllAsRead(userId);
        
        return ApiResponse.<Integer>builder()
                .message(String.format("Marked %d notifications as read", count))
                .data(count)
                .statusCode(200)
                .build();
    }
    
    /**
     * Create notification (for service-to-service calls)
     */
    @PostMapping
    @Operation(summary = "Tạo notification mới (service-to-service)")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<NotificationResponse> createNotification(
            @Valid @RequestBody CreateNotificationRequest request) {
        log.info("Creating notification: userId={}, type={}, title={}", 
                request.getUserId(), request.getType(), request.getTitle());
        
        NotificationResponse notification = notificationService.createNotification(
                request.getUserId(),
                request.getType(),
                request.getTitle(),
                request.getContent(),
                request.getReferenceId(),
                request.getReferenceType(),
                request.getActionUrl()
        );
        
        return ApiResponse.<NotificationResponse>builder()
                .message("Notification created successfully")
                .data(notification)
                .statusCode(HttpStatus.CREATED.value())
                .status("success")
                .build();
    }
    
    /**
     * Get current user ID from JWT
     */
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getClaim("userId");
        }
        throw new RuntimeException("User not authenticated");
    }
}

