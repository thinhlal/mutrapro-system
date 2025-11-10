package com.mutrapro.chat_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRequestChatRequest {
    
    @NotBlank(message = "Request ID is required")
    String requestId;
    
    @NotBlank(message = "Room name is required")
    String roomName;
    
    // User (request owner)
    @NotBlank(message = "Owner ID is required")
    String ownerId;
    
    @NotBlank(message = "Owner name is required")
    String ownerName;
    
    // Manager (assigned)
    @NotBlank(message = "Manager ID is required")
    String managerId;
    
    @NotBlank(message = "Manager name is required")
    String managerName;
}

