package com.mutrapro.identity_service.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AuthenticationResponse {
    String userId;
    String accessToken;
    String tokenType;
    Long expiresIn;
    String email;
    String role;
    String fullName;
    Boolean isNoPassword;
}

