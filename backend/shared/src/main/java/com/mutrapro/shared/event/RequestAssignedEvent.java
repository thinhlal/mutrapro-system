package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event từ Request Service khi manager được assign vào request
 * Chat Service lắng nghe để tự động tạo chat room
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RequestAssignedEvent implements Serializable {
    
    UUID eventId;           // Unique event ID for idempotency
    String requestId;       // Request ID
    String title;           // Request title
    
    // Request Owner
    String ownerId;
    String ownerName;
    
    // Assigned Manager
    String managerId;
    String managerName;
    
    Instant timestamp;      // Event timestamp
}

