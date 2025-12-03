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
public class CreateContractChatRequest {
    
    @NotBlank(message = "Contract ID is required")
    String contractId;
    
    @NotBlank(message = "Room name is required")
    String roomName;
    
    // Customer (contract owner)
    @NotBlank(message = "Customer ID is required")
    String customerId;
    
    @NotBlank(message = "Customer name is required")
    String customerName;
    
    // Manager (contract manager)
    @NotBlank(message = "Manager ID is required")
    String managerId;
    
    @NotBlank(message = "Manager name is required")
    String managerName;
}

