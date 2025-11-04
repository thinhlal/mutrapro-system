package com.mutrapro.identity_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FullUserResponse {
    // from users table (profile)
    String userId;
    String fullName;
    String phone;
    String address;
    String avatarUrl;
    Boolean active;

    // from users_auth table (auth)
    String email;
    String role;
    Boolean emailVerified;
    String authProvider;      // LOCAL / GOOGLE
    String authProviderId;    // external id (nullable)
    Boolean isNoPassword;     // true if hasLocalPassword == false
}


