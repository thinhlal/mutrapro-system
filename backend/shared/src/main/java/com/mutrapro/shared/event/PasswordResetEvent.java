package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event để gửi email password reset link
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetEvent implements Serializable {
    
    private UUID eventId; // Dùng làm idempotency key
    
    private String email;
    private String fullName;
    private String resetToken; // Plain token to include in email link
    private Long expiryHours;
    private LocalDateTime timestamp;
}

