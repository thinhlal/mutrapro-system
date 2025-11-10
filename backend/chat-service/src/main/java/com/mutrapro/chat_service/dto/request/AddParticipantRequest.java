package com.mutrapro.chat_service.dto.request;

import com.mutrapro.chat_service.enums.ParticipantRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddParticipantRequest {
    
    @NotBlank(message = "User ID is required")
    String userId;
    
    @NotNull(message = "Role is required")
    ParticipantRole role;
    
    String userName;  // Optional
}

