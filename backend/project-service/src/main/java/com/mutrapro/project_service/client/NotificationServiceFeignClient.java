package com.mutrapro.project_service.client;

import com.mutrapro.project_service.dto.request.CreateNotificationRequest;
import com.mutrapro.project_service.dto.response.NotificationResponse;
import com.mutrapro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * Feign Client to call Notification Service
 */
@FeignClient(
    name = "notification-service",
    url = "${notification.service.base-url}"
)
public interface NotificationServiceFeignClient {
    
    /**
     * Tạo notification mới
     */
    @PostMapping("/notifications")
    ApiResponse<NotificationResponse> createNotification(@RequestBody CreateNotificationRequest request);
}

