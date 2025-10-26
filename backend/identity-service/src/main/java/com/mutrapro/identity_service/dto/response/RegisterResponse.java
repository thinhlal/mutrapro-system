package com.mutrapro.identity_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RegisterResponse {
    String userId;
    String email;
    String role;
    VerificationInfo verification;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class VerificationInfo {
        String channel;            // EMAIL_OTP
        Long expiresInSeconds;     // ví dụ 900
        String requestId;          // UUID của phiên xác minh
        String nextStep;           // Hướng dẫn/step kế tiếp
    }
}


