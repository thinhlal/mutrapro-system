package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event từ Project Service khi contract được signed
 * Chat Service lắng nghe để tự động tạo chat room
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractSignedEvent implements Serializable {
    
    UUID eventId;           // Unique event ID for idempotency
    String contractId;      // Contract ID
    String contractNumber;  // Contract number for display
    String requestId;       // Request ID (để đóng request chat room)
    
    // Customer (contract owner)
    String customerId;
    String customerName;
    
    // Manager (contract manager)
    String managerId;
    String managerName;
    
    LocalDateTime signedAt;       // When contract was signed
    LocalDateTime timestamp;       // Event timestamp
}

