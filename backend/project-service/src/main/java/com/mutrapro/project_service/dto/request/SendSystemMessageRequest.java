package com.mutrapro.project_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendSystemMessageRequest {
    
    @NotBlank(message = "Room ID is required")
    String roomId;
    
    @NotBlank(message = "Message type is required")
    String messageType;  // "SYSTEM"
    
    @NotBlank(message = "Content is required")
    String content;
}

