package com.mutrapro.project_service.enums;

public enum SignSessionStatus {
    PENDING,     // OTP sent, waiting for verification
    VERIFIED,    // OTP verified successfully, signature saved
    EXPIRED,     // OTP expired (after 5 minutes)
    CANCELLED    // User cancelled or max attempts exceeded
}

