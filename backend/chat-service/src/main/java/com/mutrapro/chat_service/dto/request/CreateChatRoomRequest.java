package com.mutrapro.chat_service.dto.request;

import com.mutrapro.chat_service.enums.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateChatRoomRequest {
    
    @NotNull(message = "Room type is required")
    RoomType roomType;
    
    @NotBlank(message = "Context ID is required")
    @Size(max = 100, message = "Context ID must not exceed 100 characters")
    String contextId;  // request_id, contract_id, etc.
    
    @Size(max = 200, message = "Room name must not exceed 200 characters")
    String roomName;
    
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    String description;
}

