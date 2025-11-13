package com.mutrapro.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event gửi OTP email cho contract e-signature
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractOtpEmailEvent implements Serializable {

    private UUID eventId;

    private String contractId;
    private String contractNumber;
    private String customerName;
    private String email;
    private String otpCode;
    private Long expiresInMinutes;
    private Integer maxAttempts;
    private Instant timestamp;
}

