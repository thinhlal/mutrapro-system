package com.mutrapro.chat_service.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.mutrapro.chat_service.enums.MessageType;
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
public class SendMessageRequest {
    
    @NotBlank(message = "Room ID is required")
    String roomId;
    
    @NotNull(message = "Message type is required")
    MessageType messageType;
    
    @NotBlank(message = "Content is required")
    @Size(max = 10000, message = "Content must not exceed 10000 characters")
    String content;
    
    JsonNode metadata;  // Optional: file info, image dimensions, etc.
}

