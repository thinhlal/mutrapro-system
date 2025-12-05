package com.mutrapro.identity_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecuritySettingsResponse {

    private boolean hasLocalPassword;
    private String authProvider;
    private LocalDateTime lastPasswordChange;
    private boolean twoFactorEnabled;
    private LocalDateTime lastLoginAt;
}
