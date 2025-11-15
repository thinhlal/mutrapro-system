package com.mutrapro.identity_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecuritySettingsResponse {

    private boolean hasLocalPassword;
    private String authProvider;
    private Instant lastPasswordChange;
    private boolean twoFactorEnabled;
    private Instant lastLoginAt;
}
