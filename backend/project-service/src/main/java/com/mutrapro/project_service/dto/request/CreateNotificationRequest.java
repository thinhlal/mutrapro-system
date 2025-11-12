package com.mutrapro.project_service.dto.request;

import com.mutrapro.shared.enums.NotificationType;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateNotificationRequest {
    
    String userId;
    NotificationType type;    // NotificationType enum from shared
    String title;
    String content;
    String referenceId;       // contractId, requestId...
    String referenceType;     // CONTRACT, REQUEST...
    String actionUrl;         // URL to navigate when clicked
}

