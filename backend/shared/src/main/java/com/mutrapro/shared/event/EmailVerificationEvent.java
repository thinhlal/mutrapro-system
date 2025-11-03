package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

/**
 * Event để gửi email verification code
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerificationEvent implements Serializable {
    
    private java.util.UUID eventId; // Dùng làm idempotency key
    
    private String email;
    private String otp;
    private String fullName;
    private Instant timestamp;
}

