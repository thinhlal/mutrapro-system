package com.mutrapro.notification_service.dto.request;

import com.mutrapro.shared.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateNotificationRequest {
    
    @NotBlank(message = "User ID is required")
    String userId;
    
    @NotNull(message = "Notification type is required")
    NotificationType type;
    
    @NotBlank(message = "Title is required")
    String title;
    
    @NotBlank(message = "Content is required")
    String content;
    
    String referenceId;      // ID của entity liên quan (contractId, requestId...)
    String referenceType;    // Loại entity (CONTRACT, REQUEST...)
    String actionUrl;        // URL để navigate khi click notification
}

