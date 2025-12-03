package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
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
    
    // Customer (contract owner)
    String customerId;
    String customerName;
    
    // Manager (contract manager)
    String managerId;
    String managerName;
    
    Instant signedAt;       // When contract was signed
    Instant timestamp;       // Event timestamp
}

